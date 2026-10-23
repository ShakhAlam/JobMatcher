import httpx
import pytest

from app.store.db import KeyValueStore
from tests.conftest import JOB_DESCRIPTION, RESUME

ANTHROPIC_KEY = "sk-ant-api03-abcdefghijklmnop-WXYZ"


def test_store_round_trip(tmp_path):
    path = tmp_path / "nested" / "app.db"
    store = KeyValueStore(path)
    store.set("a", {"x": [1, 2]})
    store.set("a", {"x": [3]})
    assert store.get("a") == {"x": [3]}
    store.close()
    reopened = KeyValueStore(path)
    assert reopened.get("a") == {"x": [3]}
    reopened.delete("a")
    assert reopened.get("a", "gone") == "gone"


# --- settings ---------------------------------------------------------------


def test_defaults_come_from_server_settings(client):
    body = client.get("/api/settings").json()
    assert body["provider"] == "ollama"
    assert body["models"] == {"ollama": "qwen2.5-coder:14b", "anthropic": "claude-sonnet-5-5", "openai": "gpt-5-mini"}
    assert body["ollama_base_url"] == "http://localhost:11434"
    assert body["temperature"] == 0.0
    assert body["api_keys"] == {
        "anthropic": {"source": None, "masked": None},
        "openai": {"source": None, "masked": None},
    }


def test_saving_settings_and_a_key(client, store):
    resp = client.put(
        "/api/settings",
        json={
            "provider": "anthropic",
            "models": {"anthropic": "claude-opus-5-5"},
            "ollama_base_url": "http://gpu-box:11434/",
            "temperature": 0.3,
            "api_keys": {"anthropic": f"  {ANTHROPIC_KEY} "},
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["provider"] == "anthropic"
    assert body["models"]["anthropic"] == "claude-opus-5-5"
    assert body["models"]["ollama"] == "qwen2.5-coder:14b"  # untouched providers keep their model
    assert body["ollama_base_url"] == "http://gpu-box:11434"
    assert body["api_keys"]["anthropic"] == {"source": "saved", "masked": "sk-ant…WXYZ"}
    # The key itself never goes back to the browser, but is stored for scoring.
    assert ANTHROPIC_KEY not in resp.text
    assert store.get("api_key.anthropic") == ANTHROPIC_KEY
    assert client.get("/api/settings").json() == body


def test_removing_a_saved_key(client):
    client.put("/api/settings", json={"api_keys": {"openai": "sk-proj-1234567890abcd"}})
    body = client.put("/api/settings", json={"api_keys": {"openai": None}}).json()
    assert body["api_keys"]["openai"] == {"source": None, "masked": None}


def test_environment_key_is_reported(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-env-0000000000001234")
    assert client.get("/api/settings").json()["api_keys"]["openai"] == {"source": "env", "masked": "sk-env…1234"}


@pytest.mark.parametrize(
    "change",
    [{"temperature": 1.5}, {"provider": "gemini"}, {"api_keys": {"ollama": "x"}}, {"ollama_base_url": ""}],
)
def test_invalid_updates_are_rejected(client, change):
    assert client.put("/api/settings", json=change).status_code == 422


# --- scoring uses saved settings --------------------------------------------


def test_score_uses_saved_provider_model_and_key(client, fake_llm):
    client.put(
        "/api/settings",
        json={"provider": "anthropic", "models": {"anthropic": "claude-haiku-5-5"}, "api_keys": {"anthropic": ANTHROPIC_KEY}},
    )
    resp = client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME})
    assert resp.status_code == 200, resp.text
    assert resp.json()["model_used"] == {"provider": "anthropic", "model": "claude-haiku-5-5"}
    assert all(cfg["api_key"] == ANTHROPIC_KEY and cfg["model"] == "claude-haiku-5-5" for _, cfg in fake_llm.calls)


def test_score_uses_saved_ollama_url(client, fake_llm):
    client.put("/api/settings", json={"ollama_base_url": "http://gpu-box:11434"})
    client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME})
    assert all(cfg["base_url"] == "http://gpu-box:11434" for _, cfg in fake_llm.calls)


def test_score_without_any_key_explains_what_to_do(client):
    client.put("/api/settings", json={"provider": "openai"})
    resp = client.post("/api/score", json={"job_description": JOB_DESCRIPTION, "resume": RESUME})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No API key configured for openai. Add one in Settings."


# --- model lists -------------------------------------------------------------


def test_lists_installed_ollama_models(client, http_routes):
    http_routes["http://localhost:11434/api/tags"] = lambda r: httpx.Response(
        200,
        json={
            "models": [
                {"name": "qwen2.5-coder:14b", "size": 8988124298, "details": {"parameter_size": "14.8B", "quantization_level": "Q4_K_M"}},
                {"name": "llama3.1:8b", "size": 4920753328, "details": {"parameter_size": "8.0B"}},
            ]
        },
    )
    body = client.post("/api/models", json={"provider": "ollama"}).json()
    assert body["source"] == "live" and body["error"] is None
    assert [m["id"] for m in body["models"]] == ["llama3.1:8b", "qwen2.5-coder:14b"]
    assert body["models"][1]["detail"] == "14.8B · Q4_K_M · 9.0 GB"


def test_unreachable_ollama_is_explained(client):
    body = client.post("/api/models", json={"provider": "ollama", "ollama_base_url": "http://nowhere:1"}).json()
    assert body["models"] == []
    assert body["error"] == "Cannot reach Ollama at http://nowhere:1. Is it running?"


def test_hosted_provider_without_key_gets_suggestions(client):
    body = client.post("/api/models", json={"provider": "anthropic"}).json()
    assert body["source"] == "suggested"
    assert body["error"] is None
    assert "claude-sonnet-5-5" in [m["id"] for m in body["models"]]


def test_anthropic_live_list_uses_the_key(client, http_routes):
    seen = {}

    def handler(request: httpx.Request):
        seen["key"] = request.headers["x-api-key"]
        return httpx.Response(200, json={"data": [{"id": "claude-opus-5-5", "display_name": "Claude Opus 5.5"}]})

    http_routes["https://api.anthropic.com/v1/models"] = handler
    body = client.post("/api/models", json={"provider": "anthropic", "api_key": ANTHROPIC_KEY}).json()
    assert seen["key"] == ANTHROPIC_KEY
    assert body == {
        "provider": "anthropic",
        "models": [{"id": "claude-opus-5-5", "label": "Claude Opus 5.5", "detail": None, "size_bytes": None}],
        "source": "live",
        "error": None,
    }


def test_rejected_key_falls_back_to_suggestions(client, http_routes):
    http_routes["https://api.anthropic.com/v1/models"] = lambda r: httpx.Response(401, json={"error": "bad key"})
    body = client.post("/api/models", json={"provider": "anthropic", "api_key": "sk-ant-wrong-key-1234"}).json()
    assert body["source"] == "suggested"
    assert body["error"] == "Anthropic rejected the API key."


def test_openai_list_keeps_only_chat_models(client, http_routes):
    ids = ["gpt-5-mini", "text-embedding-3-large", "o4-mini", "gpt-4o-realtime-preview", "whisper-1", "dall-e-3"]
    http_routes["https://api.openai.com/v1/models"] = lambda r: httpx.Response(200, json={"data": [{"id": i} for i in ids]})
    client.put("/api/settings", json={"api_keys": {"openai": "sk-proj-1234567890abcd"}})
    body = client.post("/api/models", json={"provider": "openai"}).json()
    assert [m["id"] for m in body["models"]] == ["o4-mini", "gpt-5-mini"]


# --- connection test ----------------------------------------------------------


def test_connection_test_success_uses_small_output_limit(client, fake_chat):
    body = client.post("/api/settings/test", json={"provider": "ollama", "model": "llama3.1:8b"}).json()
    assert body["ok"] is True
    assert body["message"].startswith("llama3.1:8b answered in ")
    assert fake_chat.calls[0]["num_predict"] == 16
    assert fake_chat.calls[0]["base_url"] == "http://localhost:11434"


def test_connection_test_with_unsaved_key(client, fake_chat):
    body = client.post(
        "/api/settings/test", json={"provider": "anthropic", "model": "claude-haiku-5-5", "api_key": ANTHROPIC_KEY}
    ).json()
    assert body["ok"] is True
    assert fake_chat.calls[0]["api_key"] == ANTHROPIC_KEY
    assert fake_chat.calls[0]["max_tokens"] == 16


def test_connection_test_reports_missing_key(client, fake_chat):
    body = client.post("/api/settings/test", json={"provider": "openai", "model": "gpt-5-mini"}).json()
    assert body == {"ok": False, "message": "No API key configured for openai. Add one in Settings.", "latency_ms": None}
    assert fake_chat.calls == []


def test_connection_test_reports_model_errors(client, fake_chat):
    fake_chat.error = httpx.ConnectError("refused")
    body = client.post(
        "/api/settings/test", json={"provider": "ollama", "model": "llama3.1:8b", "base_url": "http://gpu-box:11434"}
    ).json()
    assert body["ok"] is False
    assert body["message"] == "Cannot reach Ollama at http://gpu-box:11434. Is `ollama serve` running?"
