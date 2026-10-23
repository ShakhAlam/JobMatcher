# Job Matcher backend

FastAPI + LangGraph service that scores a resume against a job description. See the project
[README](../README.md), [Getting started](../docs/getting-started.md) and
[Architecture](../docs/architecture.md) (including the [API reference](../docs/architecture.md#api-reference)).

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
uv run pytest
```

Configuration is read from `JOBMATCHER_*` environment variables or `backend/.env`; the full list is in
[Getting started → Configuration reference](../docs/getting-started.md#8-configuration-reference).
Data is stored in `data/jobmatcher.db` (git-ignored).

`--reload` waits for in-flight requests before restarting, so after editing code while a long score is
running, restart the server to be sure the change is live.
