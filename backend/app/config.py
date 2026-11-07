import os
from pathlib import Path


COOKIE_SECURE = os.getenv(
    "KERMEL_COOKIE_SECURE",
    "false",
).lower() == "true"

FRONTEND_DIRECTORY = Path(__file__).resolve().parents[2] / "frontend"

DEFAULT_ORIGINS = (
    "http://localhost:5500,"
    "http://127.0.0.1:5500,"
    "http://localhost:5501,"
    "http://127.0.0.1:5501"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "KERMEL_ALLOWED_ORIGINS",
        DEFAULT_ORIGINS,
    ).split(",")
    if origin.strip()
]