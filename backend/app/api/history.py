from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app import history
from app.api.deps import get_store
from app.store.db import KeyValueStore

router = APIRouter()


@router.get("/history", response_model=history.HistoryPage)
def list_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    store: KeyValueStore = Depends(get_store),
) -> history.HistoryPage:
    return history.list_entries(store, limit, offset)


@router.get("/history/{entry_id}", response_model=history.HistoryEntry)
def read_history_entry(entry_id: int, store: KeyValueStore = Depends(get_store)) -> history.HistoryEntry:
    entry = history.get(store, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="That scoring run no longer exists.")
    return entry


@router.delete("/history/{entry_id}", status_code=204)
def delete_history_entry(entry_id: int, store: KeyValueStore = Depends(get_store)) -> Response:
    if not history.delete(store, entry_id):
        raise HTTPException(status_code=404, detail="That scoring run no longer exists.")
    return Response(status_code=204)


@router.delete("/history", status_code=204)
def clear_history(store: KeyValueStore = Depends(get_store)) -> Response:
    history.clear(store)
    return Response(status_code=204)
