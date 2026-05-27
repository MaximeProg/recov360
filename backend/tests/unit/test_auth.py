import pytest


@pytest.mark.asyncio
async def test_register(client):
    payload = {
        "company_name": "Test Sarl",
        "company_email": "test@company.com",
        "first_name": "Admin",
        "last_name": "Test",
        "email": "admin@test.com",
        "password": "password123",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login(client):
    payload = {
        "company_name": "Test Sarl",
        "company_email": "test2@company.com",
        "first_name": "Admin",
        "last_name": "Test",
        "email": "admin2@test.com",
        "password": "password123",
    }
    await client.post("/api/v1/auth/register", json=payload)

    resp = await client.post("/api/v1/auth/login", json={"email": "admin2@test.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/v1/auth/login", json={"email": "ghost@test.com", "password": "wrong"})
    assert resp.status_code == 401
