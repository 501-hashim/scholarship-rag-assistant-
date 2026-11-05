import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_register_success_and_login(client):
    reg_res = client.post(
        "/api/auth/register",
        {"name": "Ananya Sharma", "email": "ananya@example.com", "password": "SecurePassword123!"},
        format="json",
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["status"] == "success"
    assert "token" in data
    assert data["user"]["email"] == "ananya@example.com"
    assert data["user"]["name"] == "Ananya Sharma"

    # Login with the newly registered user
    login_res = client.post(
        "/api/auth/login",
        {"email": "ananya@example.com", "password": "SecurePassword123!"},
        format="json",
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["status"] == "success"
    assert login_data["user"]["email"] == "ananya@example.com"

    # Verify /api/auth/me using the token
    token = login_data["token"]
    me_res = client.get("/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {token}")
    assert me_res.status_code == 200
    assert me_res.json()["authenticated"] is True
    assert me_res.json()["user"]["email"] == "ananya@example.com"


def test_register_duplicate_email_rejected(client):
    client.post(
        "/api/auth/register",
        {"name": "First User", "email": "dup@example.com", "password": "Password123!"},
        format="json",
    )
    res = client.post(
        "/api/auth/register",
        {"name": "Second User", "email": "dup@example.com", "password": "AnotherPassword123!"},
        format="json",
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["error"]["message"]


def test_login_invalid_password(client):
    client.post(
        "/api/auth/register",
        {"name": "Rahul Kumar", "email": "rahul@example.com", "password": "CorrectPassword123!"},
        format="json",
    )
    res = client.post(
        "/api/auth/login",
        {"email": "rahul@example.com", "password": "WrongPassword!"},
        format="json",
    )
    assert res.status_code == 401
    assert "Invalid email address or password" in res.json()["error"]["message"]


def test_google_auth(client):
    res = client.post(
        "/api/auth/google",
        {
            "email": "student.google@gmail.com",
            "name": "Google Student",
            "avatar": "https://example.com/avatar.jpg",
        },
        format="json",
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == "student.google@gmail.com"
    assert data["user"]["provider"] == "google"
    assert User.objects.filter(email="student.google@gmail.com").exists()

    # /api/auth/me check
    token = data["token"]
    me_res = client.get("/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {token}")
    assert me_res.status_code == 200
    assert me_res.json()["user"]["provider"] == "google"


def test_auth_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["authenticated"] is False


def test_auth_config(client):
    res = client.get("/api/auth/config")
    assert res.status_code == 200
    assert "providers" in res.json()
