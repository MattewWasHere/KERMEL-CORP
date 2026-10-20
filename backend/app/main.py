import hashlib
import hmac
import re
import secrets
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

if __package__:
    from app.database import get_connection, initialize_database
    from app.products_store import load_products
else:
    from database import get_connection, initialize_database
    from products_store import load_products


PASSWORD_ITERATIONS = 310_000
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    load_products()  # crea data/products.json la primera vez si no existe
    yield


app = FastAPI(title="KERMEL CORP API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def api_info() -> dict[str, str]:
    return {
        "name": "KERMEL CORP API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
    }


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


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


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user: RegisterRequest) -> dict[str, str]:
    name = user.name.strip()
    email = user.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")
    if not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=400, detail="El correo no es válido.")

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, hash_password(user.password)),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo.",
        ) from error

    return {"id": str(user_id), "username": name, "email": email}


@app.post("/api/auth/login")
def login_user(credentials: LoginRequest) -> dict[str, str]:
    identifier = credentials.username.strip()
    with get_connection() as connection:
        users = connection.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = ? COLLATE NOCASE OR name = ? COLLATE NOCASE
            """,
            (identifier, identifier),
        ).fetchall()

    user = next(
        (
            candidate
            for candidate in users
            if verify_password(credentials.password, candidate["password_hash"])
        ),
        None,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

    return {
        "id": str(user["id"]),
        "username": user["name"],
        "email": user["email"],
    }


@app.get("/api/products")
def list_products() -> list[dict]:
    return load_products()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)