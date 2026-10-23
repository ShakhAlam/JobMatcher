"""Past scoring runs: the inputs and the full result, so any run can be reopened later."""

import json
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

from app.scoring.schemas import MatchResult, ModelInfo
from app.store.db import KeyValueStore

_SCHEMA = """
CREATE TABLE IF NOT EXISTS score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    job_title TEXT NOT NULL,
    candidate TEXT,
    overall_score INTEGER NOT NULL,
    verdict TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    job_description TEXT NOT NULL,
    resume TEXT NOT NULL,
    result TEXT NOT NULL
)
"""
_SUMMARY_COLUMNS = "id, created_at, job_title, candidate, overall_score, verdict, provider, model"


class HistorySummary(BaseModel):
    id: int
    created_at: datetime
    job_title: str
    candidate: str | None
    overall_score: int
    verdict: str
    model_used: ModelInfo


class HistoryEntry(HistorySummary):
    job_description: str
    resume: str
    # Stored as JSON; returned as-is so entries saved by older versions still open.
    result: dict[str, Any]


class HistoryPage(BaseModel):
    items: list[HistorySummary]
    total: int


def _ensure_table(store: KeyValueStore) -> None:
    if not getattr(store, "_history_ready", False):
        store.execute(_SCHEMA)
        store._history_ready = True


def _summary(row) -> HistorySummary:
    return HistorySummary(
        id=row["id"],
        created_at=row["created_at"],
        job_title=row["job_title"],
        candidate=row["candidate"],
        overall_score=row["overall_score"],
        verdict=row["verdict"],
        model_used=ModelInfo(provider=row["provider"], model=row["model"]),
    )


def add(store: KeyValueStore, job_description: str, resume: str, result: MatchResult) -> int:
    _ensure_table(store)
    return store.execute(
        "INSERT INTO score_history (created_at, job_title, candidate, overall_score, verdict, provider, model,"
        " job_description, resume, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            datetime.now(UTC).isoformat(),
            result.requirements.title,
            result.candidate.name or result.candidate.current_title,
            result.overall_score,
            result.verdict,
            result.model_used.provider.value,
            result.model_used.model,
            job_description,
            resume,
            result.model_dump_json(),
        ),
    )


def list_entries(store: KeyValueStore, limit: int, offset: int) -> HistoryPage:
    _ensure_table(store)
    rows = store.fetch(
        f"SELECT {_SUMMARY_COLUMNS} FROM score_history ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset)
    )
    total = store.fetch("SELECT COUNT(*) FROM score_history")[0][0]
    return HistoryPage(items=[_summary(r) for r in rows], total=total)


def get(store: KeyValueStore, entry_id: int) -> HistoryEntry | None:
    _ensure_table(store)
    rows = store.fetch(
        f"SELECT {_SUMMARY_COLUMNS}, job_description, resume, result FROM score_history WHERE id = ?", (entry_id,)
    )
    if not rows:
        return None
    row = rows[0]
    return HistoryEntry(
        **_summary(row).model_dump(),
        job_description=row["job_description"],
        resume=row["resume"],
        result=json.loads(row["result"]),
    )


def delete(store: KeyValueStore, entry_id: int) -> bool:
    _ensure_table(store)
    existed = bool(store.fetch("SELECT 1 FROM score_history WHERE id = ?", (entry_id,)))
    store.execute("DELETE FROM score_history WHERE id = ?", (entry_id,))
    return existed


def clear(store: KeyValueStore) -> None:
    _ensure_table(store)
    store.execute("DELETE FROM score_history")
