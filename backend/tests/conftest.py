import os

# The app creates its SQLite store at startup; keep tests from touching the real data folder.
os.environ["JOBMATCHER_DB_PATH"] = ":memory:"

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from langchain_core.runnables import RunnableLambda  # noqa: E402

from app.api.deps import get_chat_model, get_http_client, get_store  # noqa: E402
from app.api.score import get_scoring_graph  # noqa: E402
from app.config import Settings, get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.scoring.graph import ScoringGraph  # noqa: E402
from app.scoring.schemas import (
    CandidateProfile,
    CriterionAssessment,
    JobRequirements,
    MatchAssessment,
)  # noqa: E402
from app.store.db import KeyValueStore  # noqa: E402

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


class FakeChatModel:
    """Stands in for the configurable chat model in the connection test."""

    def __init__(self):
        self.calls: list[dict] = []
        self.error: Exception | None = None

    async def ainvoke(self, prompt, config):
        self.calls.append(dict(config["configurable"]))
        if self.error:
            raise self.error
        return "OK"


@pytest.fixture
def store() -> KeyValueStore:
    return KeyValueStore(":memory:")


@pytest.fixture
def fake_chat() -> FakeChatModel:
    return FakeChatModel()


@pytest.fixture
def http_routes() -> dict:
    """Per-test handlers for outbound HTTP (model lists), keyed by URL prefix; others fail to connect."""
    return {}


@pytest.fixture
def client(fake_llm, test_settings, store, fake_chat, http_routes):
    def handle(request: httpx.Request) -> httpx.Response:
        for prefix, handler in http_routes.items():
            if str(request.url).startswith(prefix):
                return handler(request)
        raise httpx.ConnectError("unreachable in tests", request=request)

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    graph = ScoringGraph(fake_llm)
    app.dependency_overrides[get_scoring_graph] = lambda: graph
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_chat_model] = lambda: fake_chat
    app.dependency_overrides[get_http_client] = lambda: http_client
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
