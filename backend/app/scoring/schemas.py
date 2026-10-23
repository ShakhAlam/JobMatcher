"""Pydantic models shared by the scoring graph and the HTTP API."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, SecretStr, field_validator


class LLMProvider(str, Enum):
    OLLAMA = "ollama"
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


class LLMConfig(BaseModel):
    """Which model to run a scoring request on. Missing fields fall back to server settings."""

    provider: LLMProvider
    model: str = Field(min_length=1)
    api_key: SecretStr | None = None
    base_url: str | None = None
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)


# ---------------------------------------------------------------------------
# Criteria: (label, default weight, what the LLM should judge)
# ---------------------------------------------------------------------------

CRITERIA: dict[str, tuple[str, float, str]] = {
    "skills": (
        "Core skills",
        0.30,
        "How many of the job's required (must-have) skills the candidate demonstrably has.",
    ),
    "experience": (
        "Experience & seniority",
        0.20,
        "Years of relevant experience and seniority level compared with what the job asks for.",
    ),
    "responsibilities": (
        "Responsibilities & domain",
        0.20,
        "Whether the candidate has done similar work, at similar scale, in a similar domain or industry.",
    ),
    "tools": (
        "Tools & keywords",
        0.10,
        "Coverage of the specific technologies, frameworks, methods and keywords named in the job description.",
    ),
    "education": (
        "Education & certifications",
        0.10,
        "Degrees and certifications compared with those required or preferred.",
    ),
    "soft_skills": (
        "Soft skills",
        0.10,
        "Communication, leadership, collaboration and other non-technical qualities the job asks for.",
    ),
}


def _clamp_score(value: Any) -> Any:
    # Local models occasionally overshoot the 0-100 range; clamp instead of failing the request.
    if isinstance(value, (int, float)):
        return max(0, min(100, round(value)))
    return value


# ---------------------------------------------------------------------------
# Intermediate LLM outputs
# ---------------------------------------------------------------------------


class JobRequirements(BaseModel):
    """Structured requirements extracted from a job description."""

    title: str = Field(description="Job title, or a short inferred title if none is stated.")
    seniority: str | None = Field(default=None, description="e.g. junior, mid, senior, lead, principal.")
    min_years_experience: float | None = Field(default=None, description="Minimum years of experience asked for.")
    must_have_skills: list[str] = Field(default_factory=list, description="Required skills.")
    nice_to_have_skills: list[str] = Field(default_factory=list, description="Preferred / bonus skills.")
    tools_and_keywords: list[str] = Field(
        default_factory=list, description="Specific technologies, frameworks, methods and keywords named."
    )
    responsibilities: list[str] = Field(default_factory=list, description="Main duties of the role.")
    domain: str | None = Field(default=None, description="Industry or business domain, if stated.")
    education: list[str] = Field(default_factory=list, description="Required or preferred degrees.")
    certifications: list[str] = Field(default_factory=list, description="Required or preferred certifications.")
    soft_skills: list[str] = Field(default_factory=list, description="Non-technical qualities asked for.")


class CandidateProfile(BaseModel):
    """Structured facts extracted from a resume."""

    name: str | None = Field(default=None, description="Candidate name if present.")
    current_title: str | None = Field(default=None, description="Most recent job title.")
    total_years_experience: float | None = Field(
        default=None, description="Total years of professional experience, estimated from the work history."
    )
    skills: list[str] = Field(default_factory=list, description="Skills the candidate lists or demonstrates.")
    tools_and_technologies: list[str] = Field(default_factory=list, description="Technologies, frameworks, tools.")
    roles: list[str] = Field(
        default_factory=list, description="Past roles as 'Title at Company (years)' where available."
    )
    domains: list[str] = Field(default_factory=list, description="Industries or business domains worked in.")
    education: list[str] = Field(default_factory=list, description="Degrees with field of study.")
    certifications: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list, description="Demonstrated non-technical qualities.")
    achievements: list[str] = Field(default_factory=list, description="Notable quantified achievements.")


class CriterionAssessment(BaseModel):
    score: int = Field(description="0-100. 100 = fully meets or exceeds the job's needs for this criterion.")
    rationale: str = Field(description="Two or three sentences explaining why this score was given.")
    evidence: list[str] = Field(description="Short facts or phrases from the resume that support the score.")
    missing: list[str] = Field(description="What the job asks for under this criterion that the resume lacks.")

    _clamp = field_validator("score", mode="before")(_clamp_score)


class MatchAssessment(BaseModel):
    """What the scoring LLM returns. One field per criterion so none can be skipped."""

    skills: CriterionAssessment
    experience: CriterionAssessment
    responsibilities: CriterionAssessment
    tools: CriterionAssessment
    education: CriterionAssessment
    soft_skills: CriterionAssessment
    summary: str = Field(description="Three or four sentence overall assessment of the fit.")
    strengths: list[str] = Field(description="Candidate's strongest points for this job.")
    gaps: list[str] = Field(description="Most important gaps for this job.")
    recommendations: list[str] = Field(
        description="Concrete, truthful ways the candidate could tailor the resume for this job."
    )


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------


class ScoreRequest(BaseModel):
    job_description: str = Field(min_length=20, max_length=50_000)
    resume: str = Field(min_length=20, max_length=50_000)
    llm: LLMConfig | None = None
    weights: dict[str, float] | None = Field(
        default=None, description="Optional per-criterion weight overrides, keyed by criterion key."
    )

    @field_validator("weights")
    @classmethod
    def _check_weights(cls, weights: dict[str, float] | None) -> dict[str, float] | None:
        if weights is None:
            return None
        unknown = set(weights) - set(CRITERIA)
        if unknown:
            raise ValueError(f"Unknown criteria: {sorted(unknown)}. Valid keys: {list(CRITERIA)}")
        if any(w < 0 for w in weights.values()):
            raise ValueError("Weights must be non-negative")
        return weights


class CriterionScore(BaseModel):
    key: str
    label: str
    weight: float
    score: int
    rationale: str
    evidence: list[str]
    missing: list[str]


class ModelInfo(BaseModel):
    provider: LLMProvider
    model: str


class MatchResult(BaseModel):
    overall_score: int
    verdict: str
    summary: str
    criteria: list[CriterionScore]
    strengths: list[str]
    gaps: list[str]
    recommendations: list[str]
    requirements: JobRequirements
    candidate: CandidateProfile
    model_used: ModelInfo
    duration_ms: int
