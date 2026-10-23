import pytest
from fastapi.testclient import TestClient
from langchain_core.runnables import RunnableLambda

from app.api.score import get_scoring_graph
from app.config import Settings, get_settings
from app.main import app
from app.scoring.graph import ScoringGraph
from app.scoring.schemas import (
    CandidateProfile,
    CriterionAssessment,
    JobRequirements,
    MatchAssessment,
)

JOB_DESCRIPTION = "Senior Java Developer. Requires Java, Spring, SQL, 5+ years experience, BS in CS."
RESUME = "Jane Doe. Java developer, 7 years at Acme building Spring Boot services on PostgreSQL. BS CS."


def _criterion(score: int) -> CriterionAssessment:
    return CriterionAssessment(score=score, rationale=f"Scored {score}.", evidence=["Java"], missing=[])


CANNED = {
    JobRequirements: JobRequirements(title="Senior Java Developer", must_have_skills=["Java", "Spring", "SQL"]),
    CandidateProfile: CandidateProfile(name="Jane Doe", total_years_experience=7, skills=["Java", "Spring"]),
    MatchAssessment: MatchAssessment(
        skills=_criterion(90),
        experience=_criterion(80),
        responsibilities=_criterion(70),
        tools=_criterion(60),
        education=_criterion(100),
        soft_skills=_criterion(50),
        summary="Solid fit.",
        strengths=["Java depth"],
        gaps=["No Kubernetes"],
        resume_tips=["Quantify throughput"],
        skills_to_build=["Earn the Oracle Java certification"],
    ),
}


class FakeStructuredLLM:
    """Stands in for the configurable chat model: returns canned objects per schema
    and records the ``configurable`` dict each call received."""

    def __init__(self, canned=CANNED):
        self.canned = canned
        self.calls: list[tuple[str, dict]] = []

    def with_structured_output(self, schema):
        def respond(_prompt_value, config):
            self.calls.append((schema.__name__, dict(config.get("configurable", {}))))
            return self.canned[schema]

        return RunnableLambda(respond)


@pytest.fixture
def fake_llm() -> FakeStructuredLLM:
    return FakeStructuredLLM()


@pytest.fixture
def test_settings(monkeypatch) -> Settings:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    return Settings(_env_file=None, anthropic_api_key=None, openai_api_key=None)


@pytest.fixture
def client(fake_llm, test_settings):
    graph = ScoringGraph(fake_llm)
    app.dependency_overrides[get_scoring_graph] = lambda: graph
    app.dependency_overrides[get_settings] = lambda: test_settings
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
