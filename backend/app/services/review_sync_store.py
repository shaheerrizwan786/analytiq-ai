from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class IncrementalWindow:
    since: datetime | None
    until: datetime | None


@dataclass
class StoredReview:
    source: str
    review_key: str
    text: str
    rating: float | None
    date_iso: str | None
    review_context: dict[str, str] | None = None
    review_detailed_rating: dict[str, float] | None = None


class ReviewSyncStore:
    """Lightweight local persistence for review dedupe + sync checkpoints.

    Uses SQLite so the backend can remember what has already been extracted
    between API requests without requiring PostgreSQL setup.
    """

    def __init__(self, db_path: Path):
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS review_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    restaurant_name TEXT NOT NULL,
                    restaurant_location TEXT NOT NULL,
                    review_key TEXT NOT NULL,
                    review_date_iso TEXT,
                    text TEXT NOT NULL,
                    rating REAL,
                    review_context TEXT,
                    review_detailed_rating TEXT,
                    created_at TEXT NOT NULL,
                    UNIQUE(source, restaurant_name, restaurant_location, review_key)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS review_sync_state (
                    source TEXT NOT NULL,
                    restaurant_name TEXT NOT NULL,
                    restaurant_location TEXT NOT NULL,
                    last_review_date_iso TEXT,
                    last_synced_at TEXT NOT NULL,
                    PRIMARY KEY(source, restaurant_name, restaurant_location)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS source_place_links (
                    source TEXT NOT NULL,
                    restaurant_name TEXT NOT NULL,
                    restaurant_location TEXT NOT NULL,
                    source_url TEXT NOT NULL,
                    source_place_id TEXT,
                    last_verified_at TEXT NOT NULL,
                    PRIMARY KEY(source, restaurant_name, restaurant_location)
                )
                """
            )

    @staticmethod
    def _norm(s: str) -> str:
        return " ".join((s or "").strip().lower().split())

    @staticmethod
    def _parse_iso(dt: str | None) -> datetime | None:
        if not dt:
            return None
        iso = dt.strip()
        if iso.endswith("Z"):
            iso = iso[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(iso)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def get_last_review_date(
        self,
        *,
        source: str,
        restaurant_name: str,
        restaurant_location: str,
    ) -> datetime | None:
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT last_review_date_iso
                FROM review_sync_state
                WHERE source = ? AND restaurant_name = ? AND restaurant_location = ?
                """,
                (source, self._norm(restaurant_name), self._norm(restaurant_location)),
            ).fetchone()
        if not row:
            return None
        return self._parse_iso(row["last_review_date_iso"])

    def get_source_place_link(
        self,
        *,
        source: str,
        restaurant_name: str,
        restaurant_location: str,
    ) -> str | None:
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT source_url
                FROM source_place_links
                WHERE source = ? AND restaurant_name = ? AND restaurant_location = ?
                """,
                (source, self._norm(restaurant_name), self._norm(restaurant_location)),
            ).fetchone()
        if not row:
            return None
        return row["source_url"]

    def upsert_source_place_link(
        self,
        *,
        source: str,
        restaurant_name: str,
        restaurant_location: str,
        source_url: str,
        source_place_id: str | None = None,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO source_place_links (
                    source,
                    restaurant_name,
                    restaurant_location,
                    source_url,
                    source_place_id,
                    last_verified_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(source, restaurant_name, restaurant_location)
                DO UPDATE SET
                    source_url = excluded.source_url,
                    source_place_id = excluded.source_place_id,
                    last_verified_at = excluded.last_verified_at
                """,
                (
                    source,
                    self._norm(restaurant_name),
                    self._norm(restaurant_location),
                    source_url.strip(),
                    source_place_id,
                    self._now_iso(),
                ),
            )

    def get_all_reviews(
        self,
        *,
        restaurant_name: str,
        restaurant_location: str,
    ) -> list[StoredReview]:
        """Return all stored reviews for a restaurant, newest first."""
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT source, review_key, text, rating, review_date_iso,
                       review_context, review_detailed_rating
                FROM review_items
                WHERE restaurant_name = ? AND restaurant_location = ?
                ORDER BY review_date_iso DESC
                """,
                (self._norm(restaurant_name), self._norm(restaurant_location)),
            ).fetchall()
        return [
            StoredReview(
                source=row["source"],
                review_key=row["review_key"],
                text=row["text"],
                rating=row["rating"],
                date_iso=row["review_date_iso"],
                review_context=json.loads(row["review_context"]) if row["review_context"] else None,
                review_detailed_rating=json.loads(row["review_detailed_rating"]) if row["review_detailed_rating"] else None,
            )
            for row in rows
        ]

    def upsert_reviews_and_state(
        self,
        *,
        source: str,
        restaurant_name: str,
        restaurant_location: str,
        rows: list[dict],
    ) -> tuple[int, IncrementalWindow]:
        """Insert only new rows and update sync checkpoint.

        Returns: (inserted_count, window)
        where window.since is previous checkpoint, window.until is latest inserted date.
        """
        norm_name = self._norm(restaurant_name)
        norm_location = self._norm(restaurant_location)
        previous = self.get_last_review_date(
            source=source,
            restaurant_name=restaurant_name,
            restaurant_location=restaurant_location,
        )

        inserted = 0
        latest_dt = previous
        earliest_inserted: datetime | None = None

        with self._conn() as conn:
            for row in rows:
                review_key = row["review_key"]
                review_date_iso = row.get("review_date_iso")
                text = row["text"]
                rating = row.get("rating")
                review_context = row.get("review_context")
                review_detailed_rating = row.get("review_detailed_rating")

                # Serialize JSON fields
                review_context_json = json.dumps(review_context) if review_context else None
                review_detailed_rating_json = json.dumps(review_detailed_rating) if review_detailed_rating else None

                try:
                    cur = conn.execute(
                        """
                        INSERT INTO review_items (
                            source,
                            restaurant_name,
                            restaurant_location,
                            review_key,
                            review_date_iso,
                            text,
                            rating,
                            review_context,
                            review_detailed_rating,
                            created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            source,
                            norm_name,
                            norm_location,
                            review_key,
                            review_date_iso,
                            text,
                            rating,
                            review_context_json,
                            review_detailed_rating_json,
                            self._now_iso(),
                        ),
                    )
                except sqlite3.IntegrityError:
                    continue

                if cur.rowcount:
                    inserted += 1
                    dt = self._parse_iso(review_date_iso)
                    if dt is not None:
                        if earliest_inserted is None or dt < earliest_inserted:
                            earliest_inserted = dt
                        if latest_dt is None or dt > latest_dt:
                            latest_dt = dt

            conn.execute(
                """
                INSERT INTO review_sync_state (
                    source,
                    restaurant_name,
                    restaurant_location,
                    last_review_date_iso,
                    last_synced_at
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(source, restaurant_name, restaurant_location)
                DO UPDATE SET
                    last_review_date_iso = excluded.last_review_date_iso,
                    last_synced_at = excluded.last_synced_at
                """,
                (
                    source,
                    norm_name,
                    norm_location,
                    latest_dt.isoformat() if latest_dt else None,
                    self._now_iso(),
                ),
            )

        until = latest_dt if inserted > 0 else previous
        since = previous
        if inserted > 0 and since is None:
            since = earliest_inserted

        return inserted, IncrementalWindow(since=since, until=until)


def create_default_sync_store() -> ReviewSyncStore:
    backend_dir = Path(__file__).resolve().parents[2]
    db_path = backend_dir / "data" / "reviews_sync.sqlite3"
    return ReviewSyncStore(db_path)


def reset_all() -> None:
    """Delete all cached links, sync checkpoints and review items."""
    store = create_default_sync_store()
    with store._conn() as conn:
        conn.execute("DELETE FROM source_place_links")
        conn.execute("DELETE FROM review_sync_state")
        conn.execute("DELETE FROM review_items")
