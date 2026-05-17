"""Limit concurrent analyses by estimated Apify Cloud RAM (actors run on Apify, not Railway)."""

from __future__ import annotations

import asyncio
import threading
import time
from contextlib import asynccontextmanager, contextmanager
from typing import Callable

from app.config import Settings, get_settings
from app.services.apify_memory import memory_mbytes_for

_pool: "ApifyCapacityPool | None" = None


def estimate_analysis_peak_memory_mb(settings: Settings) -> int:
    """
    Worst-case overlapping Apify runs during one analyze stream.

    Typical overlap: Google reviews + TripAdvisor/Yelp URL search; later TA/Yelp review actors.
    """
    peak = memory_mbytes_for(settings, "google_maps_reviews")
    peak += memory_mbytes_for(settings, "google_search") * 2
    peak += memory_mbytes_for(settings, "tripadvisor_reviews")
    if settings.apify_yelp_enabled:
        peak += memory_mbytes_for(settings, "yelp_reviews")
    return peak


class ApifyCapacityPool:
    """One slot ≈ peak Apify memory for a full restaurant analysis."""

    def __init__(self, budget_mb: int, slot_mb: int) -> None:
        self.budget_mb = budget_mb
        self.slot_mb = max(512, slot_mb)
        self.max_slots = max(1, budget_mb // self.slot_mb)
        self._active = 0
        self._waiting = 0
        self._lock = threading.Lock()

    def stats(self) -> dict[str, int | str]:
        with self._lock:
            return {
                "active_analyses": self._active,
                "waiting_analyses": self._waiting,
                "max_concurrent_analyses": self.max_slots,
                "apify_memory_budget_mb": self.budget_mb,
                "estimated_peak_per_analysis_mb": self.slot_mb,
                "platform": "apify",
            }

    def try_acquire_slot(self) -> tuple[bool, int]:
        """Return (acquired, queue_position_if_waiting)."""
        with self._lock:
            if self._active < self.max_slots:
                self._active += 1
                return True, 0
            self._waiting += 1
            return False, self._waiting

    def cancel_wait(self) -> None:
        with self._lock:
            self._waiting = max(0, self._waiting - 1)

    @contextmanager
    def slot_sync(self, on_waiting: Callable[[int], None] | None = None):
        while True:
            with self._lock:
                if self._active < self.max_slots:
                    self._active += 1
                    break
                position = self._waiting + 1
                self._waiting += 1
            try:
                if on_waiting:
                    on_waiting(position)
                time.sleep(2.0)
            finally:
                with self._lock:
                    self._waiting = max(0, self._waiting - 1)

        try:
            yield
        finally:
            with self._lock:
                self._active = max(0, self._active - 1)

    async def release_async(self) -> None:
        with self._lock:
            self._active = max(0, self._active - 1)


def get_apify_capacity_pool() -> ApifyCapacityPool:
    global _pool
    if _pool is None:
        s = get_settings()
        slot_mb = s.apify_analysis_peak_memory_mb or estimate_analysis_peak_memory_mb(s)
        _pool = ApifyCapacityPool(s.apify_platform_memory_budget_mb, slot_mb)
    return _pool


# Back-compat alias while imports are updated
get_analysis_slot_pool = get_apify_capacity_pool
