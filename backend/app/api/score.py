import logging
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, get_settings
from app.llm.factory import LLMConfigError, resolve_llm_config, to_runnable_config
from app.scoring.graph import ScoringGraph
from app.scoring.schemas import LLMProvider, MatchResult, ModelInfo, ScoreRequest

logger = logging.getLogger(__name__)

router = APIRouter()


def get_scoring_graph(request: Request) -> ScoringGraph:
    return request.app.state.scoring_graph


@router.post("/score", response_model=MatchResult)
async def score_resume(
    body: ScoreRequest,
    graph: ScoringGraph = Depends(get_scoring_graph),
    settings: Settings = Depends(get_settings),
) -> MatchResult:
    llm_cfg = resolve_llm_config(body.llm, settings)
    try:
        config = to_runnable_config(llm_cfg, settings)
    except LLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    started = time.perf_counter()
    try:
        state = await graph.ainvoke(body.job_description, body.resume, config, weights=body.weights)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.RemoteProtocolError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"{llm_cfg.provider.value} closed the connection before answering (was it stopped or restarted?).",
        ) from exc
    except httpx.ConnectError as exc:
        where = config["configurable"].get("base_url") or llm_cfg.provider.value
        if llm_cfg.provider is LLMProvider.OLLAMA:
            detail = f"Cannot reach Ollama at {where}. Is `ollama serve` running?"
        else:
            detail = f"Cannot reach {where}: {exc}"
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        logger.exception("Scoring failed with %s/%s", llm_cfg.provider.value, llm_cfg.model)
        raise HTTPException(
            status_code=502,
            detail=f"{llm_cfg.provider.value} model '{llm_cfg.model}' failed: {type(exc).__name__}: {exc}",
        ) from exc
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
