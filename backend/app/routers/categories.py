import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app import database
from app.schemas import CategoryCreate, CategoryUpdate
from app.security import get_current_admin


router = APIRouter(prefix="/api/categories", tags=["categorías"])


def list_categories() -> list[dict[str, object]]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, description
            FROM categories
            ORDER BY name
            """
        ).fetchall()
    return [dict(row) for row in rows]


def create_category(
    data: CategoryCreate,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> dict[str, object]:
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")

    try:
        with database.get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO categories (name, description) VALUES (?, ?)",
                (name, data.description),
            )
            row = connection.execute(
                "SELECT id, name, description FROM categories WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre.",
        ) from error

    return dict(row)


def update_category(
    category_id: int,
    data: CategoryUpdate,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> dict[str, object]:
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")

    try:
        with database.get_connection() as connection:
            cursor = connection.execute(
                """
                UPDATE categories
                SET name = ?, description = ?
                WHERE id = ?
                """,
                (name, data.description, category_id),
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Categoría no encontrada.",
                )

            connection.execute(
                "UPDATE products SET category = ? WHERE category_id = ?",
                (name, category_id),
            )
            row = connection.execute(
                "SELECT id, name, description FROM categories WHERE id = ?",
                (category_id,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre.",
        ) from error

    return dict(row)


router.add_api_route("", list_categories, methods=["GET"])
router.add_api_route(
    "",
    create_category,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/{category_id}",
    update_category,
    methods=["PUT"],
)