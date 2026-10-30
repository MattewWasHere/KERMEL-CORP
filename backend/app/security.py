import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Cookie, HTTPException, status

from app import database


PASSWORD_ITERATIONS = 310_000
SESSION_DURATION = timedelta(hours=12)
SESSION_COOKIE_NAME = "kermel_session"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return f"{salt.hex()}:{password_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt_hex, expected_hash = stored_hash.split(":", maxsplit=1)
    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        PASSWORD_ITERATIONS,
    ).hex()
    return hmac.compare_digest(actual_hash, expected_hash)


def session_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> dict[str, object]:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inicia sesión para continuar.",
        )

    now = datetime.now(timezone.utc)
    hashed_token = session_hash(token)
    with database.get_connection() as connection:
        session_record = connection.execute(
            """
            SELECT users.id, users.name, users.email, sessions.expires_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
            """,
            (hashed_token,),
        ).fetchone()
        if session_record is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión no es válida. Inicia sesión de nuevo.",
            )

        session_expired = datetime.fromisoformat(session_record["expires_at"]) <= now
        if session_expired:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (hashed_token,),
            )

    if session_expired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión expiró. Inicia sesión de nuevo.",
        )

    return {
        "id": session_record["id"],
        "username": session_record["name"],
        "email": session_record["email"],
    }
