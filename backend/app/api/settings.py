import asyncio
import time

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, SecretStr

from app import user_settings
from app.api.deps import get_chat_model, get_http_client, get_store
from app.config import Settings, get_settings
from app.llm import catalog
from app.llm.errors import describe_llm_error
from app.llm.factory import LLMConfigError, resolve_llm_config, to_runnable_config
from app.scoring.schemas import LLMConfig, LLMProvider
from app.store.db import KeyValueStore
from app.user_settings import SettingsUpdate, SettingsView

router = APIRouter()

# Loading a large local model for the first time can take a while.
TEST_TIMEOUT_SECONDS = 120


@router.get("/settings", response_model=SettingsView)
def read_settings(
    store: KeyValueStore = Depends(get_store), settings: Settings = Depends(get_settings)
) -> SettingsView:
    return user_settings.view(store, settings)


@router.put("/settings", response_model=SettingsView)
def update_settings(
    change: SettingsUpdate,
    store: KeyValueStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
) -> SettingsView:
    return user_settings.update(store, settings, change)


class ModelsRequest(BaseModel):
    provider: LLMProvider
    # Optional unsaved values from the Settings form, so models can be listed before saving.
    api_key: SecretStr | None = None
    ollama_base_url: str | None = None


@router.post("/models", response_model=catalog.ModelList)
async def list_models(
    body: ModelsRequest,
    store: KeyValueStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> catalog.ModelList:
    user = user_settings.load(store, settings)
    api_key = None
    if body.provider is not LLMProvider.OLLAMA:
        api_key = (
            (body.api_key.get_secret_value() if body.api_key else None)
            or user_settings.saved_api_keys(store).get(body.provider)
            or user_settings.env_api_key(body.provider, settings)
        )
    return await catalog.list_models(
        client, body.provider, api_key=api_key, ollama_base_url=body.ollama_base_url or user.ollama_base_url
    )


class ConnectionTest(BaseModel):
    provider: LLMProvider
    model: str = Field(min_length=1)
    api_key: SecretStr | None = None
    base_url: str | None = None


class ConnectionResult(BaseModel):
    ok: bool
    message: str
    latency_ms: int | None = None


@router.post("/settings/test", response_model=ConnectionResult)
async def test_connection(
    body: ConnectionTest,
    store: KeyValueStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    chat_model=Depends(get_chat_model),
) -> ConnectionResult:
    """Send a tiny prompt with the given (possibly unsaved) settings and report what happened."""
    requested = LLMConfig(provider=body.provider, model=body.model, api_key=body.api_key, base_url=body.base_url)
    cfg = resolve_llm_config(requested, settings, user_settings.load(store, settings))
    try:
        config = to_runnable_config(cfg, settings, user_settings.saved_api_keys(store))
    except LLMConfigError as exc:
        return ConnectionResult(ok=False, message=str(exc))
    # Keep the check cheap: a few output tokens are enough to prove the model answers.
    limit = "num_predict" if cfg.provider is LLMProvider.OLLAMA else "max_tokens"
    config["configurable"][limit] = 16

    started = time.perf_counter()
    try:
        await asyncio.wait_for(
            chat_model.ainvoke("Reply with the single word OK.", config), timeout=TEST_TIMEOUT_SECONDS
        )
    except Exception as exc:
        return ConnectionResult(ok=False, message=describe_llm_error(exc, cfg, config["configurable"].get("base_url")))
    latency_ms = round((time.perf_counter() - started) * 1000)
    return ConnectionResult(ok=True, message=f"{cfg.model} answered in {latency_ms / 1000:.1f}s.", latency_ms=latency_ms)
