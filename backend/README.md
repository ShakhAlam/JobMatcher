# Job Matcher backend

FastAPI + LangGraph service that scores a resume against a job description.

```bash
uv sync
uv run uvicorn app.main:app --reload        # http://localhost:8000/docs
uv run pytest
```

`POST /api/score` with `{"job_description": "...", "resume": "...", "llm": {"provider": "ollama", "model": "llama3.1:8b"}}`.
`llm` is optional; defaults come from `JOBMATCHER_*` env vars (see `app/config.py`).
Claude/OpenAI need `api_key` in the request, `JOBMATCHER_ANTHROPIC_API_KEY` / `JOBMATCHER_OPENAI_API_KEY`, or the standard `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.
