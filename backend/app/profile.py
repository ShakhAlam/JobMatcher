"""The user's profile: who they are and a default resume to prefill the Score page."""

from datetime import UTC, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.store.db import KeyValueStore

PROFILE_KEY = "profile"
MAX_RESUME_CHARS = 50_000  # same limit as ScoreRequest.resume


class Profile(BaseModel):
    name: str = Field(default="", max_length=120)
    email: EmailStr | None = None
    headline: str = Field(default="", max_length=200, description="e.g. 'Senior Java engineer, fintech'")
    default_resume: str = Field(default="", max_length=MAX_RESUME_CHARS)
    default_resume_filename: str | None = Field(default=None, max_length=255)
    updated_at: datetime | None = None

    @field_validator("email", mode="before")
    @classmethod
    def _blank_email_is_none(cls, value):
        return value.strip() or None if isinstance(value, str) else value

    @field_validator("name", "headline", "default_resume", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value


def load(store: KeyValueStore) -> Profile:
    return Profile.model_validate(store.get(PROFILE_KEY) or {})


def save(store: KeyValueStore, profile: Profile) -> Profile:
    stored = profile.model_copy(update={"updated_at": datetime.now(UTC)})
    store.set(PROFILE_KEY, stored.model_dump(mode="json"))
    return stored
