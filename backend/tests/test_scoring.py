import pytest
from pydantic import SecretStr

from app.llm.factory import LLMConfigError, to_runnable_config
from app.scoring.graph import ScoringGraph, effective_weights, verdict_for, weighted_score
from app.scoring.schemas import CRITERIA, CriterionAssessment, LLMConfig, LLMProvider
from tests.conftest import JOB_DESCRIPTION, RESUME

# Canned scores: skills 90 (.3), experience 80 (.2), responsibilities 70 (.2),
# tools 60 (.1), education 100 (.1), soft_skills 50 (.1) -> 27+16+14+6+10+5 = 78
EXPECTED_OVERALL = 78


def test_default_weights_sum_to_one():
    assert sum(w for _, w, _ in CRITERIA.values()) == pytest.approx(1.0)


@pytest.mark.parametrize(
    ("score", "verdict"),
    [(100, "Strong match"), (80, "Strong match"), (79, "Good match"), (65, "Good match"),
     (64, "Partial match"), (45, "Partial match"), (44, "Poor match"), (0, "Poor match")],
)
def test_verdict_bands(score, verdict):
    assert verdict_for(score) == verdict


def test_weighted_score_normalises_weights():
    assert weighted_score({"a": 100, "b": 0}, {"a": 3, "b": 1}) == 75


def test_zero_weights_rejected():
    with pytest.raises(ValueError):
        effective_weights({key: 0 for key in CRITERIA})


def test_score_is_clamped():
    assert CriterionAssessment(score=130, rationale="x", evidence=[], missing=[]).score == 100
    assert CriterionAssessment(score=-5, rationale="x", evidence=[], missing=[]).score == 0


async def test_graph_scores_all_criteria(fake_llm):
    config = {"configurable": {"model": "fake-model"}}
    state = await ScoringGraph(fake_llm).ainvoke(JOB_DESCRIPTION, RESUME, config)

    assert [c.key for c in state["criteria"]] == list(CRITERIA)
    assert state["overall_score"] == EXPECTED_OVERALL
    assert state["verdict"] == "Good match"
    # Both extractions plus the scoring call, each receiving the per-request model config.
    assert sorted(name for name, _ in fake_llm.calls) == ["CandidateProfile", "JobRequirements", "MatchAssessment"]
    assert all(cfg["model"] == "fake-model" for _, cfg in fake_llm.calls)


async def test_graph_applies_weight_overrides(fake_llm):
    weights = {key: 0.0 for key in CRITERIA} | {"education": 1.0}
    state = await ScoringGraph(fake_llm).ainvoke(JOB_DESCRIPTION, RESUME, {}, weights=weights)
    assert state["overall_score"] == 100


def test_ollama_config_has_no_api_key(test_settings):
    cfg = LLMConfig(provider=LLMProvider.OLLAMA, model="llama3.1:8b")
    configurable = to_runnable_config(cfg, test_settings)["configurable"]
    assert configurable["model_provider"] == "ollama"
    assert configurable["base_url"] == test_settings.ollama_base_url
    assert configurable["num_ctx"] == test_settings.ollama_num_ctx
    assert "api_key" not in configurable


def test_hosted_provider_requires_key(test_settings):
    with pytest.raises(LLMConfigError):
        to_runnable_config(LLMConfig(provider=LLMProvider.ANTHROPIC, model="claude-sonnet-5-5"), test_settings)


def test_hosted_provider_uses_request_key(test_settings):
    cfg = LLMConfig(provider=LLMProvider.OPENAI, model="gpt-5", api_key=SecretStr("sk-test"))
    configurable = to_runnable_config(cfg, test_settings)["configurable"]
    assert configurable["api_key"] == "sk-test"
    assert "num_ctx" not in configurable
