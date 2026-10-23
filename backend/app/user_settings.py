"""User-editable settings (provider, models, keys), persisted in the local store.

Server settings (app/config.py) supply the defaults; anything saved here overrides them.
API keys are stored locally and never sent back to the browser, only a masked preview.
"""

import os
from typing import Literal

from pydantic import BaseModel, Field

from app.config import Settings
from app.scoring.schemas import LLMProvider
from app.store.db import KeyValueStore

SETTINGS_KEY = "user_settings"
API_KEY_PREFIX = "api_key."

HOSTED_PROVIDERS = (LLMProvider.ANTHROPIC, LLMProvider.OPENAI)

DEFAULT_HOSTED_MODELS = {
    LLMProvider.ANTHROPIC: "claude-sonnet-5-5",
    LLMProvider.OPENAI: "gpt-5-mini",
}

_KEY_ENV_VARS = {
    LLMProvider.ANTHROPIC: "ANTHROPIC_API_KEY",
    LLMProvider.OPENAI: "OPENAI_API_KEY",
}


class UserSettings(BaseModel):
    provider: LLMProvider
    # The last model chosen for each provider, so switching providers back and forth keeps choices.
    models: dict[LLMProvider, str]
    ollama_base_url: str
    temperature: float = Field(ge=0.0, le=1.0)

    @property
    def model(self) -> str:
        return self.models[self.provider]


class ApiKeyStatus(BaseModel):
    source: Literal["saved", "env"] | None = None
    masked: str | None = None


class SettingsView(UserSettings):
    api_keys: dict[LLMProvider, ApiKeyStatus]


class SettingsUpdate(BaseModel):
    provider: LLMProvider | None = None
    models: dict[LLMProvider, str] | None = None
    ollama_base_url: str | None = Field(default=None, min_length=1)
    temperature: float | None = Field(default=None, ge=0.0, le=1.0)
    # A string saves a key; null or "" removes the saved key.
    api_keys: dict[Literal["anthropic", "openai"], str | None] | None = None


def mask_key(key: str) -> str:
    return f"{key[:6]}…{key[-4:]}" if len(key) > 12 else f"…{key[-2:]}"


def defaults(settings: Settings) -> UserSettings:
    models = {LLMProvider.OLLAMA: settings.default_model, **DEFAULT_HOSTED_MODELS}
    if settings.default_provider is not LLMProvider.OLLAMA:
        models[settings.default_provider] = settings.default_model
    return UserSettings(
        provider=settings.default_provider,
        models=models,
        ollama_base_url=settings.ollama_base_url,
        temperature=settings.default_temperature,
    )


def load(store: KeyValueStore, settings: Settings) -> UserSettings:
    base = defaults(settings)
    saved = store.get(SETTINGS_KEY) or {}
    merged = base.model_dump() | {k: v for k, v in saved.items() if k != "models"}
    merged["models"] = base.models | {LLMProvider(k): v for k, v in saved.get("models", {}).items()}
    return UserSettings.model_validate(merged)


def saved_api_keys(store: KeyValueStore) -> dict[LLMProvider, str]:
    keys = {}
    for provider in HOSTED_PROVIDERS:
        value = store.get(API_KEY_PREFIX + provider.value)
        if value:
            keys[provider] = value
    return keys


def env_api_key(provider: LLMProvider, settings: Settings) -> str | None:
    configured = settings.anthropic_api_key if provider is LLMProvider.ANTHROPIC else settings.openai_api_key
    if configured is not None and configured.get_secret_value():
        return configured.get_secret_value()
    return os.environ.get(_KEY_ENV_VARS[provider]) or None


def key_status(store: KeyValueStore, settings: Settings) -> dict[LLMProvider, ApiKeyStatus]:
    saved = saved_api_keys(store)
    status = {}
    for provider in HOSTED_PROVIDERS:
        if provider in saved:
            status[provider] = ApiKeyStatus(source="saved", masked=mask_key(saved[provider]))
        elif key := env_api_key(provider, settings):
            status[provider] = ApiKeyStatus(source="env", masked=mask_key(key))
        else:
            status[provider] = ApiKeyStatus()
    return status


def view(store: KeyValueStore, settings: Settings) -> SettingsView:
    return SettingsView(**load(store, settings).model_dump(), api_keys=key_status(store, settings))


def update(store: KeyValueStore, settings: Settings, change: SettingsUpdate) -> SettingsView:
    current = load(store, settings)
    data = current.model_dump()
    if change.provider is not None:
        data["provider"] = change.provider
    if change.models:
        data["models"] = current.models | {p: m.strip() for p, m in change.models.items() if m.strip()}
    if change.ollama_base_url is not None:
        data["ollama_base_url"] = change.ollama_base_url.strip().rstrip("/")
    if change.temperature is not None:
        data["temperature"] = change.temperature
    validated = UserSettings.model_validate(data)
    store.set(SETTINGS_KEY, validated.model_dump(mode="json"))

    for name, key in (change.api_keys or {}).items():
        if key and key.strip():
            store.set(API_KEY_PREFIX + name, key.strip())
        else:
            store.delete(API_KEY_PREFIX + name)
    return view(store, settings)
