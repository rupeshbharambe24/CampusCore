"""Smoke test for the health endpoint. Runs without a DB by stubbing get_db."""

from collections.abc import AsyncGenerator, Iterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.db import get_db
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def _fake_db() -> AsyncGenerator[AsyncMock, None]:
        session = AsyncMock()
        result = MagicMock()
        result.scalar_one.return_value = 1
        session.execute.return_value = result
        yield session

    app.dependency_overrides[get_db] = _fake_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"] == "CampusCore API"
    assert body["database"] == "ok"
