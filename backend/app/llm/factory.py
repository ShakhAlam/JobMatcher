"""Model selection via LangChain's configurable chat model.

One configurable model is built at startup; each request picks the provider, model and
credentials through ``RunnableConfig["configurable"]``, which LangGraph passes down to
every node.
"""

from collections.abc import Mapping

from langchain.chat_models import init_chat_model
from langchain_core.runnables import RunnableConfig

from app import user_settings
from app.config import Settings
from app.scoring.schemas import LLMConfig, LLMProvider
from app.user_settings import UserSettings

CONFIGURABLE_FIELDS = ("model", "model_provider", "temperature", "api_key", "base_url", "num_ctx", "num_predict", "max_tokens")


class LLMConfigError(ValueError):
    """The requested model cannot be used as configured (for example, a missing API key)."""


def build_configurable_llm():
    return init_chat_model(configurable_fields=CONFIGURABLE_FIELDS)


def resolve_llm_config(requested: LLMConfig | None, settings: Settings, user: UserSettings | None = None) -> LLMConfig:
    """Use the request's model if it names one, otherwise the user's saved choice."""
    user = user or user_settings.defaults(settings)
    if requested is not None:
        if requested.provider is LLMProvider.OLLAMA and not requested.base_url:
            return requested.model_copy(update={"base_url": user.ollama_base_url})
        return requested
    return LLMConfig(
        provider=user.provider,
        model=user.model,
        temperature=user.temperature,
        base_url=user.ollama_base_url if user.provider is LLMProvider.OLLAMA else None,
    )


def _api_key(cfg: LLMConfig, settings: Settings, saved_keys: Mapping[LLMProvider, str]) -> str:
    # Precedence: key sent with the request, key saved in Settings, server env/config.
    if cfg.api_key is not None and cfg.api_key.get_secret_value():
        return cfg.api_key.get_secret_value()
    if saved := saved_keys.get(cfg.provider):
        return saved
    if from_env := user_settings.env_api_key(cfg.provider, settings):
        return from_env
    raise LLMConfigError(f"No API key configured for {cfg.provider.value}. Add one in Settings.")


def to_runnable_config(
    cfg: LLMConfig, settings: Settings, saved_keys: Mapping[LLMProvider, str] | None = None
) -> RunnableConfig:
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
        configurable["num_predict"] = settings.max_output_tokens
    else:
        configurable["api_key"] = _api_key(cfg, settings, saved_keys or {})
        configurable["max_tokens"] = settings.max_output_tokens
        if cfg.base_url:
            configurable["base_url"] = cfg.base_url
    return {"configurable": configurable}
