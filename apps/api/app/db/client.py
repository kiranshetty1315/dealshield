"""Supabase Client and Database Session Factory.

Provides a unified interface for database operations. If configured with live
Supabase credentials, connects via supabase-py. If placeholder credentials are
present (default in local dev and CI test environments), automatically utilizes
an in-memory database engine supporting PostgREST query operations.
"""

import os
import sys
import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import copy
import uuid
from datetime import datetime, timezone
from app.core.config import settings

LOCAL_CACHE_FILE = Path(__file__).parent.parent.parent / ".local_db_cache.json"

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any


class MockResponse:
    """Simulates PostgREST API response."""
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else 1)


class MockTableQueryBuilder:
    """Simulates PostgREST query chain (insert, select, eq, order, execute)."""

    def __init__(
        self,
        storage: Dict[str, List[Dict[str, Any]]],
        table_name: str,
        on_change: Optional[Callable[[], None]] = None,
    ):
        self._storage = storage
        self._table = table_name
        self._on_change = on_change
        self._action = "select"
        self._insert_data: Any = None
        self._update_data: Any = None
        self._filters: List[tuple] = []
        self._order_col: Optional[str] = None
        self._order_desc: bool = False
        self._limit_count: Optional[int] = None
        self._single: bool = False

        if table_name not in self._storage:
            self._storage[table_name] = []

    def insert(self, data: Any):
        self._action = "insert"
        self._insert_data = data
        return self

    def update(self, data: Any):
        self._action = "update"
        self._update_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def select(self, columns: str = "*"):
        self._action = "select"
        return self

    def eq(self, column: str, value: Any):
        self._filters.append((column, value))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, count: int):
        self._limit_count = count
        return self

    def single(self):
        self._single = True
        return self

    def execute(self) -> MockResponse:
        rows = self._storage[self._table]

        if self._action == "insert":
            inserted = []
            items = self._insert_data if isinstance(self._insert_data, list) else [self._insert_data]
            for item in items:
                row = copy.deepcopy(item)
                if "id" not in row or not row["id"]:
                    row["id"] = str(uuid.uuid4())
                if "created_at" not in row:
                    row["created_at"] = datetime.now(timezone.utc).isoformat()
                rows.append(row)
                inserted.append(row)
            if self._on_change:
                self._on_change()
            return MockResponse(inserted if isinstance(self._insert_data, list) else inserted[0])

        elif self._action == "update":
            updated = []
            for row in rows:
                match = True
                for col, val in self._filters:
                    if str(row.get(col)) != str(val):
                        match = False
                        break
                if match:
                    for k, v in self._update_data.items():
                        row[k] = v
                    updated.append(copy.deepcopy(row))
            if self._on_change and updated:
                self._on_change()
            return MockResponse(updated if not self._single else (updated[0] if updated else None))

        elif self._action == "delete":
            deleted = []
            remaining = []
            for row in rows:
                match = True
                if self._filters:
                    for col, val in self._filters:
                        if str(row.get(col)) != str(val):
                            match = False
                            break
                if match:
                    deleted.append(row)
                else:
                    remaining.append(row)
            self._storage[self._table] = remaining
            if self._on_change and deleted:
                self._on_change()
            return MockResponse(deleted)

        else:  # select
            matched = []
            for row in rows:
                match = True
                for col, val in self._filters:
                    if str(row.get(col)) != str(val):
                        match = False
                        break
                if match:
                    matched.append(copy.deepcopy(row))

            if self._order_col:
                matched.sort(
                    key=lambda r: r.get(self._order_col, ""),
                    reverse=self._order_desc
                )

            if self._limit_count is not None:
                matched = matched[:self._limit_count]

            if self._single:
                res_data = matched[0] if matched else None
            else:
                res_data = matched

            return MockResponse(res_data)


class LocalMemoryDatabase:
    """In-memory PostgREST compatible database for tests and offline development with file persistence."""

    def __init__(self):
        self._storage: Dict[str, List[Dict[str, Any]]] = {
            "users": [],
            "conversations": [],
            "messages": [],
            "analyses": [],
            "agreements": [],
            "agreement_versions": [],
            "confirmations": [],
            "audit_events": [],
            "document_hashes": [],
        }
        self._load_from_disk()

    def _should_persist(self) -> bool:
        return "pytest" not in sys.modules and not os.environ.get("PYTEST_CURRENT_TEST")

    def _load_from_disk(self):
        if not self._should_persist():
            return
        if LOCAL_CACHE_FILE.exists():
            try:
                with open(LOCAL_CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for k, v in data.items():
                            if k in self._storage and isinstance(v, list):
                                self._storage[k] = v
            except Exception:
                pass

    def save_to_disk(self):
        if not self._should_persist():
            return
        try:
            with open(LOCAL_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self._storage, f, indent=2)
        except Exception:
            pass

    def table(self, table_name: str) -> MockTableQueryBuilder:
        return MockTableQueryBuilder(self._storage, table_name, on_change=self.save_to_disk)

    def reset(self):
        """Reset all tables (useful for unit test isolation)."""
        for k in self._storage:
            self._storage[k].clear()


# Singleton in-memory DB instance
_local_db_instance = LocalMemoryDatabase()


def is_live_supabase_configured() -> bool:
    """Checks whether non-placeholder Supabase credentials are configured."""
    # Always isolate tests to in-memory local database engine
    if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    url = settings.SUPABASE_URL.lower()
    key = settings.SUPABASE_SERVICE_ROLE_KEY.lower()
    if not url or "placeholder" in url or "your-project" in url:
        return False
    if not key or "placeholder" in key or "your-supabase" in key:
        return False
    return True


def get_supabase_client(use_service_role: bool = True):
    """Returns official Supabase client if configured, otherwise returns local database."""
    if is_live_supabase_configured() and create_client is not None:
        key = settings.SUPABASE_SERVICE_ROLE_KEY if use_service_role else settings.SUPABASE_ANON_KEY
        return create_client(settings.SUPABASE_URL, key)
    return _local_db_instance
