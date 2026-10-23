"""Server settings, read from environment variables (prefix JOBMATCHER_) or backend/.env."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.scoring.schemas import LLMProvider


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="JOBMATCHER_", env_file=".env", extra="ignore")

    default_provider: LLMProvider = LLMProvider.OLLAMA
    default_model: str = "glm-4.7-flash:q4_K_M"
    default_temperature: float = 0.0

    ollama_base_url: str = "http://localhost:11434"
    # Ollama's default context window is small enough to silently truncate a long resume + JD.
    ollama_num_ctx: int = 16384
    max_output_tokens: int = 4096

    # Fallback keys; requests may also pass a key. Standard provider env vars are honoured too.
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
