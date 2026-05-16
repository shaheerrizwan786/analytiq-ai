"""Guard Apify async dataset reads.

Concurrent ``dataset.iterate_items()`` calls through ``impit.AsyncClient`` can
incorrectly surface ``ApifyApiError: Insufficient permissions for the dataset``
when multiple datasets are read at once in the same process. Holding one lock
during iteration serializes reads while actor ``.call()`` waits still overlap across
tasks.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

_DATASET_ITERATE_LOCK = asyncio.Lock()


async def iterate_dataset_items_locked(
    client: Any,
    dataset_id: str,
) -> AsyncIterator[Any]:
    async with _DATASET_ITERATE_LOCK:
        async for item in client.dataset(dataset_id).iterate_items():
            yield item
