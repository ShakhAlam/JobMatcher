"""Turns exceptions from LLM calls into messages a user can act on."""

import httpx

from app.scoring.schemas import LLMConfig, LLMProvider


def describe_llm_error(exc: Exception, cfg: LLMConfig, base_url: str | None) -> str:
    if isinstance(exc, httpx.RemoteProtocolError):
        return f"{cfg.provider.value} closed the connection before answering (was it stopped or restarted?)."
    if isinstance(exc, httpx.ConnectError):
        if cfg.provider is LLMProvider.OLLAMA:
            return f"Cannot reach Ollama at {base_url}. Is `ollama serve` running?"
        return f"Cannot reach {base_url or cfg.provider.value}: {exc}"
    if isinstance(exc, TimeoutError):
        return f"{cfg.provider.value} model '{cfg.model}' did not answer in time."
    # Provider SDKs (anthropic, openai, ollama) raise their own types; their messages are descriptive.
    status = getattr(exc, "status_code", None)
    if status in (401, 403):
        return f"{cfg.provider.value} rejected the API key."
    if status == 404 or "not found" in str(exc).lower():
        return f"Model '{cfg.model}' was not found on {cfg.provider.value}."
    return f"{cfg.provider.value} model '{cfg.model}' failed: {type(exc).__name__}: {exc}"
