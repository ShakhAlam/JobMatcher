"""Server settings, read from environment variables (prefix JOBMATCHER_) or backend/.env."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.scoring.schemas import LLMProvider


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="JOBMATCHER_", env_file=".env", extra="ignore")

    default_provider: LLMProvider = LLMProvider.OLLAMA
    # Fits fully in a 16 GB GPU with the 16k context below; larger models spill to CPU and crawl.
    default_model: str = "qwen2.5-coder:14b"
    default_temperature: float = 0.0

    ollama_base_url: str = "http://localhost:11434"
    # Ollama's default context window is small enough to silently truncate a long resume + JD.
    ollama_num_ctx: int = 16384
    # Caps every model's output (num_predict for Ollama) so a runaway generation ends instead of
    # filling the whole context.
    max_output_tokens: int = 4096

    # Fallback keys; requests may also pass a key. Standard provider env vars are honoured too.
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Local SQLite file for saved settings and API keys (relative to the backend folder).
    db_path: str = "data/jobmatcher.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
