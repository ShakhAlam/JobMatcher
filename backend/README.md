# Job Matcher backend

FastAPI + LangGraph service that scores a resume against a job description.

```bash
uv sync
uv run uvicorn app.main:app --reload        # http://localhost:8000/docs
uv run pytest
```

| Endpoint | Purpose |
|---|---|
| `POST /api/score` | `{job_description, resume, llm?}` → scores, explanations, advice. Without `llm`, uses the model saved in Settings. |
| `POST /api/extract-text` | Multipart `file` (PDF, DOCX or text, ≤ 5 MB) → `{text, file_type, pages, char_count, warnings}` |
| `GET` / `PUT /api/settings` | Provider, model per provider, Ollama URL, temperature, API keys (returned masked only) |
| `POST /api/models` | `{provider, api_key?, ollama_base_url?}` → installed Ollama models, or the provider's live list (suggested list without a key) |
| `POST /api/settings/test` | `{provider, model, api_key?, base_url?}` → sends a tiny prompt and reports success or the error |

Settings and API keys are stored in `data/jobmatcher.db` (SQLite, git-ignored). Server defaults come from
`JOBMATCHER_*` env vars (see `app/config.py`). Claude/OpenAI keys are looked up in this order: request,
saved in Settings, `JOBMATCHER_ANTHROPIC_API_KEY` / `JOBMATCHER_OPENAI_API_KEY`, then `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.

`--reload` waits for in-flight requests before restarting, so after editing code while a long score is running,
restart the server to be sure the change is live.
