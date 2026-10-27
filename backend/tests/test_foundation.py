from datetime import timedelta
from uuid import uuid4

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.modules.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)


class FakeSession:
    def __init__(self, user: User | None):
        self.user = user

    async def scalar(self, _query):
        return self.user


async def request_app(method: str, url: str, **kwargs):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, url, **kwargs)


def test_password_hashing_and_verification():
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_expired_token_is_rejected():
    token = create_access_token(uuid4(), timedelta(seconds=-1))
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def test_metadata_contains_all_phase_one_entities():
    expected = {
        "users", "clients", "services", "packages", "package_items",
        "quotations", "quotation_line_items", "invoices", "invoice_line_items",
        "payments", "expenses", "retainers", "company_settings",
    }
    assert expected == set(Base.metadata.tables)


@pytest.mark.asyncio
async def test_login_success_and_invalid_credentials():
    user = User(
        id=uuid4(),
        email="owner@example.com",
        full_name="Owner",
        password_hash=hash_password("secret"),
        is_active=True,
    )

    async def override_db():
        yield FakeSession(user)

    app.dependency_overrides[get_db] = override_db
    try:
        response = await request_app(
            "POST", "/api/v1/auth/login",
            json={"email": "owner@example.com", "password": "secret"},
        )
        assert response.status_code == 200
        assert response.json()["token_type"] == "bearer"
        assert response.json()["access_token"]

        invalid = await request_app(
            "POST", "/api/v1/auth/login",
            json={"email": "owner@example.com", "password": "incorrect"},
        )
        assert invalid.status_code == 401
        assert user.password_hash not in invalid.text
        assert "access_token" not in invalid.text
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_protected_me_route_requires_valid_token():
    user = User(
        id=uuid4(),
        email="owner@example.com",
        full_name="Owner",
        password_hash=hash_password("secret"),
        is_active=True,
    )

    async def override_db():
        yield FakeSession(user)

    app.dependency_overrides[get_db] = override_db
    try:
        unauthorized = await request_app("GET", "/api/v1/auth/me")
        assert unauthorized.status_code == 401

        token = create_access_token(user.id)
        authorized = await request_app(
            "GET", "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert authorized.status_code == 200
        assert authorized.json()["email"] == "owner@example.com"
        assert "password_hash" not in authorized.text
    finally:
        app.dependency_overrides.clear()
