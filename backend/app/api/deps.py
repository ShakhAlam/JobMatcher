"""Shared FastAPI dependencies; objects are created once in main.lifespan and overridden in tests."""

import httpx
from fastapi import Request

from app.store.db import KeyValueStore


def get_store(request: Request) -> KeyValueStore:
    return request.app.state.store


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


def get_chat_model(request: Request):
    return request.app.state.chat_model
