from tests.conftest import JOB_DESCRIPTION, RESUME
from tests.test_scoring import EXPECTED_OVERALL


def score(client, **extra):
    return client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME, **extra})


# --- profile ------------------------------------------------------------------


def test_empty_profile_by_default(client):
    assert client.get("/api/profile").json() == {
        "name": "",
        "email": None,
        "headline": "",
        "default_resume": "",
        "default_resume_filename": None,
        "updated_at": None,
    }


def test_save_and_reload_profile(client):
    resp = client.put(
        "/api/profile",
        json={
            "name": "  Alex Rivera ",
            "email": "alex@example.com",
            "headline": "Senior Java engineer",
            "default_resume": RESUME,
            "default_resume_filename": "alex.pdf",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Alex Rivera"
    assert body["updated_at"] is not None
    assert client.get("/api/profile").json() == body


def test_blank_email_is_allowed_and_bad_email_rejected(client):
    assert client.put("/api/profile", json={"email": "  "}).json()["email"] is None
    assert client.put("/api/profile", json={"email": "not-an-email"}).status_code == 422


def test_resume_length_is_limited(client):
    assert client.put("/api/profile", json={"default_resume": "x" * 50_001}).status_code == 422


# --- history ------------------------------------------------------------------


def test_scoring_saves_a_history_entry(client):
    result = score(client).json()
    assert isinstance(result["history_id"], int)

    page = client.get("/api/history").json()
    assert page["total"] == 1
    item = page["items"][0]
    assert item == {
        "id": result["history_id"],
        "created_at": item["created_at"],
        "job_title": "Senior Java Developer",
        "candidate": "Jane Doe",
        "overall_score": EXPECTED_OVERALL,
        "verdict": "Good match",
        "model_used": {"provider": "ollama", "model": "qwen2.5-coder:14b"},
    }

    entry = client.get(f"/api/history/{result['history_id']}").json()
    assert entry["job_description"] == JOB_DESCRIPTION
    assert entry["resume"] == RESUME
    assert entry["result"]["overall_score"] == EXPECTED_OVERALL
    assert entry["result"]["criteria"][0]["key"] == "skills"


def test_history_can_be_skipped(client):
    assert score(client, save_to_history=False).json()["history_id"] is None
    assert client.get("/api/history").json() == {"items": [], "total": 0}


def test_failed_scores_are_not_saved(client, fake_llm):
    fake_llm.canned = {}
    assert score(client).status_code == 502
    assert client.get("/api/history").json()["total"] == 0


def test_history_is_newest_first_and_paged(client):
    ids = [score(client).json()["history_id"] for _ in range(3)]
    page = client.get("/api/history", params={"limit": 2}).json()
    assert page["total"] == 3
    assert [i["id"] for i in page["items"]] == [ids[2], ids[1]]
    rest = client.get("/api/history", params={"limit": 2, "offset": 2}).json()
    assert [i["id"] for i in rest["items"]] == [ids[0]]


def test_delete_one_and_clear_all(client):
    first, second = (score(client).json()["history_id"] for _ in range(2))
    assert client.delete(f"/api/history/{first}").status_code == 204
    assert client.get(f"/api/history/{first}").status_code == 404
    assert client.delete(f"/api/history/{first}").status_code == 404
    assert [i["id"] for i in client.get("/api/history").json()["items"]] == [second]

    assert client.delete("/api/history").status_code == 204
    assert client.get("/api/history").json()["total"] == 0


def test_history_survives_a_restart(tmp_path):
    from app import history
    from app.scoring.schemas import CandidateProfile, JobRequirements, MatchResult
    from app.store.db import KeyValueStore
    from tests.conftest import CANNED

    result = MatchResult.model_validate(
        {
            "overall_score": 80,
            "verdict": "Strong match",
            "summary": "s",
            "criteria": [],
            "strengths": [],
            "gaps": [],
            "resume_tips": [],
            "skills_to_build": [],
            "requirements": CANNED[JobRequirements].model_dump(),
            "candidate": CANNED[CandidateProfile].model_dump(),
            "model_used": {"provider": "ollama", "model": "m"},
            "duration_ms": 1,
        }
    )
    path = tmp_path / "app.db"
    store = KeyValueStore(path)
    entry_id = history.add(store, "jd", "resume", result)
    store.close()
    assert history.get(KeyValueStore(path), entry_id).result["verdict"] == "Strong match"
