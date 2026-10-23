"""FastAPI entry point. Run with: uv run uvicorn app.main:app --reload"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import extract, score
from app.config import get_settings
from app.llm.factory import build_configurable_llm
from app.scoring.graph import ScoringGraph


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.scoring_graph = ScoringGraph(build_configurable_llm())
    yield


app = FastAPI(title="Job Matcher", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(score.router, prefix="/api", tags=["scoring"])
app.include_router(extract.router, prefix="/api", tags=["documents"])


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
