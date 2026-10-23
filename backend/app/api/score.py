import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from app import user_settings
from app.api.deps import get_store
from app.config import Settings, get_settings
from app.llm.errors import describe_llm_error
from app.llm.factory import LLMConfigError, resolve_llm_config, to_runnable_config
from app.scoring.graph import ScoringGraph
from app.scoring.schemas import MatchResult, ModelInfo, ScoreRequest
from app.store.db import KeyValueStore

logger = logging.getLogger(__name__)

router = APIRouter()


def get_scoring_graph(request: Request) -> ScoringGraph:
    return request.app.state.scoring_graph


@router.post("/score", response_model=MatchResult)
async def score_resume(
    body: ScoreRequest,
    graph: ScoringGraph = Depends(get_scoring_graph),
    settings: Settings = Depends(get_settings),
    store: KeyValueStore = Depends(get_store),
) -> MatchResult:
    # Without an explicit model in the request, use the one chosen on the Settings page.
    llm_cfg = resolve_llm_config(body.llm, settings, user_settings.load(store, settings))
    try:
        config = to_runnable_config(llm_cfg, settings, user_settings.saved_api_keys(store))
    except LLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    started = time.perf_counter()
    try:
        state = await graph.ainvoke(body.job_description, body.resume, config, weights=body.weights)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Scoring failed with %s/%s", llm_cfg.provider.value, llm_cfg.model)
        detail = describe_llm_error(exc, llm_cfg, config["configurable"].get("base_url"))
        raise HTTPException(status_code=502, detail=detail) from exc
    duration_ms = round((time.perf_counter() - started) * 1000)

    assessment = state["assessment"]
    return MatchResult(
        overall_score=state["overall_score"],
        verdict=state["verdict"],
        summary=assessment.summary,
        criteria=state["criteria"],
        strengths=assessment.strengths,
        gaps=assessment.gaps,
        resume_tips=assessment.resume_tips,
        skills_to_build=assessment.skills_to_build,
        requirements=state["requirements"],
        candidate=state["candidate"],
        model_used=ModelInfo(provider=llm_cfg.provider, model=llm_cfg.model),
        duration_ms=duration_ms,
    )
