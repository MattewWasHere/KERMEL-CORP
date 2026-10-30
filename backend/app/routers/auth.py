import re
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app import database
from app.config import COOKIE_SECURE
from app.schemas import LoginRequest, RegisterRequest
from app.security import (
    SESSION_COOKIE_NAME,
    SESSION_DURATION,
    get_current_user,
    hash_password,
    session_hash,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["autenticación"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(registration: RegisterRequest) -> dict[str, str]:
    name = registration.name.strip()
    email = registration.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")
    if not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=400, detail="El correo no es válido.")

    try:
        with database.get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, hash_password(registration.password)),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo.",
        ) from error

    return {"id": str(user_id), "username": name, "email": email}


@router.post("/login")
def login_user(credentials: LoginRequest, response: Response) -> dict[str, str]:
    identifier = credentials.username.strip()
    with database.get_connection() as connection:
        users = connection.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = ? COLLATE NOCASE OR name = ? COLLATE NOCASE
            """,
            (identifier, identifier),
        ).fetchall()

    authenticated_user = next(
        (
            candidate
            for candidate in users
            if verify_password(credentials.password, candidate["password_hash"])
        ),
        None,
    )
    if authenticated_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    with database.get_connection() as connection:
        connection.execute(
            "DELETE FROM sessions WHERE expires_at <= ?",
            (now.isoformat(),),
        )
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (
                session_hash(token),
                authenticated_user["id"],
                (now + SESSION_DURATION).isoformat(),
            ),
        )

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=int(SESSION_DURATION.total_seconds()),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {
        "id": str(authenticated_user["id"]),
        "username": authenticated_user["name"],
        "email": authenticated_user["email"],
    }


@router.get("/me")
def current_user(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    return user


@router.post("/logout")
def logout_user(
    response: Response,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> dict[str, str]:
    if token is not None:
        with database.get_connection() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (session_hash(token),),
            )
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"message": "Sesión cerrada."}
