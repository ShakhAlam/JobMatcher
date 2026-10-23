"""Model selection via LangChain's configurable chat model.

One configurable model is built at startup; each request picks the provider, model and
credentials through ``RunnableConfig["configurable"]``, which LangGraph passes down to
every node.
"""

import os

from langchain.chat_models import init_chat_model
from langchain_core.runnables import RunnableConfig

from app.config import Settings
from app.scoring.schemas import LLMConfig, LLMProvider

CONFIGURABLE_FIELDS = ("model", "model_provider", "temperature", "api_key", "base_url", "num_ctx", "max_tokens")

_KEY_ENV_VARS = {
    LLMProvider.ANTHROPIC: "ANTHROPIC_API_KEY",
    LLMProvider.OPENAI: "OPENAI_API_KEY",
}


class LLMConfigError(ValueError):
    """The requested model cannot be used as configured (for example, a missing API key)."""


def build_configurable_llm():
    return init_chat_model(configurable_fields=CONFIGURABLE_FIELDS)


def resolve_llm_config(requested: LLMConfig | None, settings: Settings) -> LLMConfig:
    if requested is not None:
        return requested
    return LLMConfig(
        provider=settings.default_provider,
        model=settings.default_model,
        temperature=settings.default_temperature,
    )


def _api_key(cfg: LLMConfig, settings: Settings) -> str:
    if cfg.api_key is not None and cfg.api_key.get_secret_value():
        return cfg.api_key.get_secret_value()
    configured = settings.anthropic_api_key if cfg.provider is LLMProvider.ANTHROPIC else settings.openai_api_key
    if configured is not None and configured.get_secret_value():
        return configured.get_secret_value()
    from_env = os.environ.get(_KEY_ENV_VARS[cfg.provider])
    if from_env:
        return from_env
    raise LLMConfigError(f"No API key configured for {cfg.provider.value}. Add one in Settings.")


def to_runnable_config(cfg: LLMConfig, settings: Settings) -> RunnableConfig:
    """Translate an LLMConfig into the ``configurable`` dict init_chat_model understands.

    Only parameters the chosen provider's chat model accepts are included.
    """
    configurable: dict = {
        "model": cfg.model,
        "model_provider": cfg.provider.value,
        "temperature": cfg.temperature,
    }
    if cfg.provider is LLMProvider.OLLAMA:
        configurable["base_url"] = cfg.base_url or settings.ollama_base_url
        configurable["num_ctx"] = settings.ollama_num_ctx
    else:
        configurable["api_key"] = _api_key(cfg, settings)
        configurable["max_tokens"] = settings.max_output_tokens
        if cfg.base_url:
            configurable["base_url"] = cfg.base_url
    return {"configurable": configurable}
