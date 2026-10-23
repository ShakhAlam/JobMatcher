"""LangGraph pipeline that scores a resume against a job description.

    START ─┬─> extract_requirements ─┐
           └─> extract_candidate ────┴─> score_criteria ─> finalize ─> END

The two extraction nodes run in parallel. The overall score is computed in Python from the
per-criterion scores and weights, so it is deterministic for a given assessment.
"""

import json
from typing import TypedDict

from langchain_core.exceptions import OutputParserException
from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import Runnable, RunnableConfig
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ValidationError

from app.scoring import prompts
from app.scoring.schemas import (
    CRITERIA,
    CandidateProfile,
    CriterionScore,
    JobRequirements,
    MatchAssessment,
)

VERDICT_BANDS: list[tuple[int, str]] = [
    (80, "Strong match"),
    (65, "Good match"),
    (45, "Partial match"),
    (0, "Poor match"),
]


class ScoringState(TypedDict, total=False):
    job_description: str
    resume: str
    weights: dict[str, float]
    requirements: JobRequirements
    candidate: CandidateProfile
    assessment: MatchAssessment
    overall_score: int
    verdict: str
    criteria: list[CriterionScore]


def verdict_for(score: int) -> str:
    return next(label for threshold, label in VERDICT_BANDS if score >= threshold)


def effective_weights(overrides: dict[str, float] | None) -> dict[str, float]:
    weights = {key: default for key, (_, default, _) in CRITERIA.items()}
    weights.update(overrides or {})
    if sum(weights.values()) <= 0:
        raise ValueError("At least one criterion weight must be greater than zero")
    return weights


def weighted_score(scores: dict[str, int], weights: dict[str, float]) -> int:
    total_weight = sum(weights[key] for key in scores)
    return round(sum(scores[key] * weights[key] for key in scores) / total_weight)


class ScoringGraph:
    def __init__(self, llm: BaseChatModel | Runnable):
        self.extract_requirements_chain = self._structured(prompts.EXTRACT_REQUIREMENTS, llm, JobRequirements)
        self.extract_candidate_chain = self._structured(prompts.EXTRACT_CANDIDATE, llm, CandidateProfile)
        self.score_chain = self._structured(prompts.SCORE_MATCH, llm, MatchAssessment)

        builder = StateGraph(ScoringState)
        builder.add_node("extract_requirements", self.extract_requirements)
        builder.add_node("extract_candidate", self.extract_candidate)
        builder.add_node("score_criteria", self.score_criteria)
        builder.add_node("finalize", self.finalize)
        builder.add_edge(START, "extract_requirements")
        builder.add_edge(START, "extract_candidate")
        builder.add_edge(["extract_requirements", "extract_candidate"], "score_criteria")
        builder.add_edge("score_criteria", "finalize")
        builder.add_edge("finalize", END)
        self.graph = builder.compile()

    @staticmethod
    def _structured(prompt, llm, schema: type[BaseModel]) -> Runnable:
        # Small local models sometimes emit JSON that fails validation; one retry usually fixes it.
        return (prompt | llm.with_structured_output(schema)).with_retry(
            retry_if_exception_type=(ValidationError, OutputParserException, json.JSONDecodeError),
            stop_after_attempt=2,
        )

    async def extract_requirements(self, state: ScoringState, config: RunnableConfig) -> dict:
        requirements = await self.extract_requirements_chain.ainvoke(
            {"job_description": state["job_description"]}, config
        )
        return {"requirements": requirements}

    async def extract_candidate(self, state: ScoringState, config: RunnableConfig) -> dict:
        candidate = await self.extract_candidate_chain.ainvoke({"resume": state["resume"]}, config)
        return {"candidate": candidate}

    async def score_criteria(self, state: ScoringState, config: RunnableConfig) -> dict:
        assessment = await self.score_chain.ainvoke(
            {
                "requirements": state["requirements"].model_dump_json(indent=2),
                "candidate": state["candidate"].model_dump_json(indent=2),
                "resume": state["resume"],
                "job_description": state["job_description"],
            },
            config,
        )
        return {"assessment": assessment}

    def finalize(self, state: ScoringState) -> dict:
        assessment = state["assessment"]
        weights = effective_weights(state.get("weights"))
        criteria = []
        for key, (label, _, _) in CRITERIA.items():
            item = getattr(assessment, key)
            criteria.append(
                CriterionScore(
                    key=key,
                    label=label,
                    weight=weights[key],
                    score=item.score,
                    rationale=item.rationale,
                    evidence=item.evidence,
                    missing=item.missing,
                )
            )
        overall = weighted_score({c.key: c.score for c in criteria}, weights)
        return {"criteria": criteria, "overall_score": overall, "verdict": verdict_for(overall)}

    async def ainvoke(
        self,
        job_description: str,
        resume: str,
        config: RunnableConfig,
        weights: dict[str, float] | None = None,
    ) -> ScoringState:
        # Validate weights before spending any LLM calls.
        effective_weights(weights)
        return await self.graph.ainvoke(
            {"job_description": job_description, "resume": resume, "weights": weights or {}},
            config,
        )
