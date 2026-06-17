"""CORS coverage for local frontend origins."""

import pytest


@pytest.mark.asyncio
@pytest.mark.parametrize("origin", ["http://localhost:3000", "http://127.0.0.1:3000"])
async def test_local_frontend_origins_are_allowed(client, origin):
    response = await client.get("/api/v1/department", headers={"Origin": origin})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
