"""Central Apify actor starts with per-workload memory."""

from __future__ import annotations

from typing import Any

from apify_client import ApifyClient, ApifyClientAsync
from apify_client.errors import ApifyApiError

from app.config import Settings
from app.services.apify_memory import MemoryProfile, memory_for_review_source, memory_mbytes_for


def call_actor_sync(
    client: ApifyClient,
    actor_id: str,
    *,
    settings: Settings,
    profile: MemoryProfile,
    run_input: dict[str, Any],
    wait_secs: int | None = None,
    timeout_secs: int | None = None,
) -> dict[str, Any] | None:
    kwargs: dict[str, Any] = {
        "run_input": run_input,
        "memory_mbytes": memory_mbytes_for(settings, profile),
    }
    if wait_secs is not None:
        kwargs["wait_secs"] = wait_secs
    if timeout_secs is not None:
        kwargs["timeout_secs"] = timeout_secs
    return client.actor(actor_id).call(**kwargs)


async def call_actor_async(
    client: ApifyClientAsync,
    actor_id: str,
    *,
    settings: Settings,
    profile: MemoryProfile,
    run_input: dict[str, Any],
    wait_secs: int | None = None,
    timeout_secs: int | None = None,
) -> dict[str, Any] | None:
    kwargs: dict[str, Any] = {
        "run_input": run_input,
        "memory_mbytes": memory_mbytes_for(settings, profile),
    }
    if wait_secs is not None:
        kwargs["wait_secs"] = wait_secs
    if timeout_secs is not None:
        kwargs["timeout_secs"] = timeout_secs
    return await client.actor(actor_id).call(**kwargs)


async def call_review_actor_async(
    client: ApifyClientAsync,
    actor_id: str,
    *,
    settings: Settings,
    source: str,
    run_input: dict[str, Any],
) -> dict[str, Any] | None:
    kwargs: dict[str, Any] = {
        "run_input": run_input,
        "memory_mbytes": memory_for_review_source(settings, source),
        "wait_secs": settings.apify_wait_secs,
    }
    return await client.actor(actor_id).call(**kwargs)


def call_review_actor_sync(
    client: ApifyClient,
    actor_id: str,
    *,
    settings: Settings,
    source: str,
    run_input: dict[str, Any],
) -> dict[str, Any] | None:
    return client.actor(actor_id).call(
        run_input=run_input,
        memory_mbytes=memory_for_review_source(settings, source),
        wait_secs=settings.apify_wait_secs,
    )


__all__ = ["ApifyApiError", "call_actor_async", "call_actor_sync", "call_review_actor_async", "call_review_actor_sync"]
