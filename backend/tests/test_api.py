from tests.conftest import JOB_DESCRIPTION, RESUME
from tests.test_scoring import EXPECTED_OVERALL


def test_score_endpoint_returns_full_result(client, fake_llm):
    resp = client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["overall_score"] == EXPECTED_OVERALL
    assert body["verdict"] == "Good match"
    assert len(body["criteria"]) == 6
    assert body["criteria"][0] == {
        "key": "skills",
        "label": "Core skills",
        "weight": 0.3,
        "score": 90,
        "rationale": "Scored 90.",
        "evidence": ["Java"],
        "missing": [],
    }
    assert body["strengths"] == ["Java depth"]
    assert body["resume_tips"] == ["Quantify throughput"]
    assert body["skills_to_build"] == ["Earn the Oracle Java certification"]
    assert body["requirements"]["title"] == "Senior Java Developer"
    assert body["model_used"] == {"provider": "ollama", "model": "qwen2.5-coder:14b"}
    # Server defaults reach the model through RunnableConfig.
    assert all(cfg["model_provider"] == "ollama" for _, cfg in fake_llm.calls)


def test_score_endpoint_uses_requested_model(client, fake_llm):
    resp = client.post(
        "/api/score",
        json={
            "job_description": JOB_DESCRIPTION,
            "resume": RESUME,
            "llm": {"provider": "anthropic", "model": "claude-sonnet-5-5", "api_key": "sk-ant-test"},
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["model_used"] == {"provider": "anthropic", "model": "claude-sonnet-5-5"}
    assert all(cfg["model"] == "claude-sonnet-5-5" for _, cfg in fake_llm.calls)


def test_missing_api_key_is_400(client):
    resp = client.post(
        "/api/score",
        json={"job_description": JOB_DESCRIPTION, "resume": RESUME, "llm": {"provider": "openai", "model": "gpt-5"}},
    )
    assert resp.status_code == 400
    assert "API key" in resp.json()["detail"]


def test_unknown_weight_key_is_422(client):
    resp = client.post(
        "/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME, "weights": {"luck": 1}}
    )
    assert resp.status_code == 422


def test_empty_resume_is_422(client):
    resp = client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": ""})
    assert resp.status_code == 422


def test_llm_failure_is_502(client, fake_llm):
    fake_llm.canned = {}  # KeyError inside the fake simulates a provider failure
    resp = client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME})
    assert resp.status_code == 502
