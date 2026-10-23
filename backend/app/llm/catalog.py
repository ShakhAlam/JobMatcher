"""Lists the models a user can pick for each provider.

Ollama: the models installed locally (/api/tags). Claude and OpenAI: the provider's live
model list when a key is available, otherwise a short suggested list.
"""

from typing import Literal

import httpx
from pydantic import BaseModel

from app.scoring.schemas import LLMProvider

ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models"
OPENAI_MODELS_URL = "https://api.openai.com/v1/models"


class ModelOption(BaseModel):
    id: str
    label: str
    detail: str | None = None
    size_bytes: int | None = None


class ModelList(BaseModel):
    provider: LLMProvider
    models: list[ModelOption]
    source: Literal["live", "suggested"]
    # Why the live list could not be loaded (unreachable server, rejected key, ...).
    error: str | None = None


SUGGESTED: dict[LLMProvider, list[ModelOption]] = {
    LLMProvider.ANTHROPIC: [
        ModelOption(id="claude-sonnet-5-5", label="Claude Sonnet 5.5", detail="Balanced speed and quality"),
        ModelOption(id="claude-opus-5-5", label="Claude Opus 5.5", detail="Most thorough"),
        ModelOption(id="claude-haiku-5-5", label="Claude Haiku 5.5", detail="Fastest, lowest cost"),
        ModelOption(id="claude-fable-5-1", label="Claude Fable 5.1"),
    ],
    LLMProvider.OPENAI: [
        ModelOption(id="gpt-5-mini", label="GPT-5 mini"),
        ModelOption(id="gpt-5", label="GPT-5"),
        ModelOption(id="gpt-5-nano", label="GPT-5 nano"),
    ],
}

# OpenAI's /v1/models also lists embedding, audio, image and moderation models.
_OPENAI_CHAT_PREFIXES = ("gpt-", "o1", "o3", "o4", "chatgpt-")
_OPENAI_EXCLUDE = ("embedding", "audio", "realtime", "tts", "transcribe", "image", "search", "moderation", "instruct")


def _gb(size: int) -> str:
    return f"{size / 1_000_000_000:.1f} GB"


def _http_error(provider: str, exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        if exc.response.status_code in (401, 403):
            return f"{provider} rejected the API key."
        return f"{provider} returned HTTP {exc.response.status_code}."
    if isinstance(exc, httpx.ConnectError):
        return f"Cannot reach {provider}."
    if isinstance(exc, httpx.TimeoutException):
        return f"{provider} did not answer in time."
    return f"Could not load models from {provider}: {exc}"


async def list_ollama(client: httpx.AsyncClient, base_url: str) -> ModelList:
    try:
        resp = await client.get(f"{base_url.rstrip('/')}/api/tags")
        resp.raise_for_status()
    except httpx.ConnectError:
        return ModelList(
            provider=LLMProvider.OLLAMA,
            models=[],
            source="live",
            error=f"Cannot reach Ollama at {base_url}. Is it running?",
        )
    except httpx.HTTPError as exc:
        return ModelList(provider=LLMProvider.OLLAMA, models=[], source="live", error=_http_error("Ollama", exc))

    options = []
    for m in resp.json().get("models", []):
        details = m.get("details") or {}
        parts = [details.get("parameter_size"), details.get("quantization_level")]
        if m.get("size"):
            parts.append(_gb(m["size"]))
        options.append(
            ModelOption(
                id=m["name"],
                label=m["name"],
                detail=" · ".join(p for p in parts if p) or None,
                size_bytes=m.get("size"),
            )
        )
    options.sort(key=lambda o: o.id)
    return ModelList(provider=LLMProvider.OLLAMA, models=options, source="live")


async def list_anthropic(client: httpx.AsyncClient, api_key: str) -> list[ModelOption]:
    resp = await client.get(
        ANTHROPIC_MODELS_URL,
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        params={"limit": 100},
    )
    resp.raise_for_status()
    return [ModelOption(id=m["id"], label=m.get("display_name") or m["id"]) for m in resp.json().get("data", [])]


async def list_openai(client: httpx.AsyncClient, api_key: str) -> list[ModelOption]:
    resp = await client.get(OPENAI_MODELS_URL, headers={"Authorization": f"Bearer {api_key}"})
    resp.raise_for_status()
    ids = [
        m["id"]
        for m in resp.json().get("data", [])
        if m["id"].startswith(_OPENAI_CHAT_PREFIXES) and not any(x in m["id"] for x in _OPENAI_EXCLUDE)
    ]
    return [ModelOption(id=i, label=i) for i in sorted(ids, reverse=True)]


async def list_models(
    client: httpx.AsyncClient, provider: LLMProvider, *, api_key: str | None, ollama_base_url: str
) -> ModelList:
    if provider is LLMProvider.OLLAMA:
        return await list_ollama(client, ollama_base_url)

    suggested = ModelList(provider=provider, models=SUGGESTED[provider], source="suggested")
    if not api_key:
        return suggested
    name = "Anthropic" if provider is LLMProvider.ANTHROPIC else "OpenAI"
    try:
        fetch = list_anthropic if provider is LLMProvider.ANTHROPIC else list_openai
        models = await fetch(client, api_key)
    except httpx.HTTPError as exc:
        return suggested.model_copy(update={"error": _http_error(name, exc)})
    return ModelList(provider=provider, models=models, source="live") if models else suggested
