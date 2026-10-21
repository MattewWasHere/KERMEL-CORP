import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "test.db")
    with TestClient(app) as test_client:
        yield test_client


def test_root_and_health_endpoints(client):
    root_response = client.get("/")
    health_response = client.get("/api/health")

    assert root_response.status_code == 200
    assert root_response.json() == {
        "name": "KERMEL CORP API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
    }
    assert health_response.status_code == 200
    assert health_response.json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200


def test_register_persists_user_with_hashed_password(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "  Ana Pérez  ",
            "email": "  ANA@example.com ",
            "password": "clave-segura-123",
        },
    )

    assert response.status_code == 201
    assert response.json()["username"] == "Ana Pérez"
    assert response.json()["email"] == "ana@example.com"

    with database.get_connection() as connection:
        user = connection.execute(
            "SELECT name, email, password_hash FROM users"
        ).fetchone()

    assert user["name"] == "Ana Pérez"
    assert user["email"] == "ana@example.com"
    assert user["password_hash"] != "clave-segura-123"
    assert ":" in user["password_hash"]


def test_register_rejects_duplicate_email_case_insensitively(client):
    payload = {
        "name": "Ana",
        "email": "ana@example.com",
        "password": "clave-segura-123",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 201

    duplicate = client.post(
        "/api/auth/register",
        json={**payload, "email": "ANA@EXAMPLE.COM"},
    )

    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Ya existe una cuenta con ese correo."


@pytest.mark.parametrize(
    ("payload", "expected_status"),
    [
        (
            {"name": "Ana", "email": "no-es-correo", "password": "clave-segura"},
            400,
        ),
        (
            {"name": "   ", "email": "ana@example.com", "password": "clave-segura"},
            400,
        ),
        (
            {"name": "Ana", "email": "ana@example.com", "password": "corta"},
            422,
        ),
        (
            {"email": "ana@example.com", "password": "clave-segura"},
            422,
        ),
    ],
)
def test_register_rejects_invalid_input(client, payload, expected_status):
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == expected_status


@pytest.mark.parametrize("identifier", ["ana", "ana@example.com", "ANA@EXAMPLE.COM"])
def test_login_accepts_name_or_email_case_insensitively(client, identifier):
    client.post(
        "/api/auth/register",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "password": "clave-segura-123",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={"username": identifier, "password": "clave-segura-123"},
    )

    assert response.status_code == 200
    assert response.json()["username"] == "Ana"
    assert response.json()["email"] == "ana@example.com"


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("ana@example.com", "incorrecta"),
        ("no-existe@example.com", "clave-segura-123"),
    ],
)
def test_login_rejects_invalid_credentials(client, username, password):
    client.post(
        "/api/auth/register",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "password": "clave-segura-123",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales incorrectas."


def test_database_errors_roll_back_and_close_connection(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "rollback.db")
    database.initialize_database()

    with pytest.raises(sqlite3.IntegrityError):
        with database.get_connection() as connection:
            connection.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                ("Ana", "ana@example.com", "hash"),
            )
            connection.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                ("Otra Ana", "ANA@EXAMPLE.COM", "hash"),
            )

    with database.get_connection() as connection:
        count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    assert count == 0


def test_cors_allows_frontend_origin(client):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:5500",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5500"
