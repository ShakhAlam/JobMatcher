from fastapi import APIRouter, Depends

from app import profile
from app.api.deps import get_store
from app.profile import Profile
from app.store.db import KeyValueStore

router = APIRouter()


@router.get("/profile", response_model=Profile)
def read_profile(store: KeyValueStore = Depends(get_store)) -> Profile:
    return profile.load(store)


@router.put("/profile", response_model=Profile)
def update_profile(body: Profile, store: KeyValueStore = Depends(get_store)) -> Profile:
    return profile.save(store, body)
