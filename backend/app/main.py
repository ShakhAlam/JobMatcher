"""FastAPI entry point. Run with: uv run uvicorn app.main:app --reload"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import extract, history, profile, score, settings
from app.config import get_settings
from app.llm.factory import build_configurable_llm
from app.scoring.graph import ScoringGraph
from app.store.db import KeyValueStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = get_settings()
    app.state.chat_model = build_configurable_llm()
    app.state.scoring_graph = ScoringGraph(app.state.chat_model)
    app.state.store = KeyValueStore(config.db_path)
    app.state.http_client = httpx.AsyncClient(timeout=15)
    yield
    await app.state.http_client.aclose()
    app.state.store.close()


app = FastAPI(title="Job Matcher", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(score.router, prefix="/api", tags=["scoring"])
app.include_router(extract.router, prefix="/api", tags=["documents"])
app.include_router(settings.router, prefix="/api", tags=["settings"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(history.router, prefix="/api", tags=["history"])


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
