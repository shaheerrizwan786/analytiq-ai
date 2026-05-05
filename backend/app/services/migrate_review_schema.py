"""Migration script to add review_context and review_detailed_rating columns to existing databases.

Run this once to upgrade existing review_items tables.
"""

import sqlite3
import sys
from pathlib import Path


def migrate_review_schema(db_path: Path) -> None:
    """Add new columns to review_items table if they don't exist."""
    if not db_path.exists():
        print(f"Database not found at {db_path}, skipping migration")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(review_items)")
        columns = {row[1] for row in cursor.fetchall()}

        migrations_applied = []

        if "review_context" not in columns:
            cursor.execute("ALTER TABLE review_items ADD COLUMN review_context TEXT")
            migrations_applied.append("review_context")

        if "review_detailed_rating" not in columns:
            cursor.execute("ALTER TABLE review_items ADD COLUMN review_detailed_rating TEXT")
            migrations_applied.append("review_detailed_rating")

        conn.commit()

        if migrations_applied:
            print(f"[OK] Migration completed: Added columns {', '.join(migrations_applied)}")
        else:
            print("[OK] Schema already up to date, no migration needed")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    # Force UTF-8 output on Windows
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')

    backend_dir = Path(__file__).resolve().parents[2]
    db_path = backend_dir / "data" / "reviews_sync.sqlite3"

    print(f"Migrating database at: {db_path}")
    migrate_review_schema(db_path)
