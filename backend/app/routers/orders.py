import sqlite3
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import database
from app.schemas import OrderRequest
from app.security import get_current_user


router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])


def serialize_order(order: sqlite3.Row) -> dict[str, object]:
    return {
        "id": order["id"],
        "fecha": order["created_at"],
        "cliente": order["cliente"],
        "producto": order["producto"],
        "categoria": order["categoria"],
        "total": order["total"],
        "estado": order["estado"],
    }


@router.get("/recientes")
def recent_orders(
    user: Annotated[dict[str, object], Depends(get_current_user)],
    limite: Annotated[int, Query(ge=1, le=100)] = 12,
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        orders = connection.execute(
            "SELECT * FROM orders ORDER BY id DESC LIMIT ?",
            (limite,),
        ).fetchall()
    return [serialize_order(order) for order in orders]


@router.get("")
def orders_since(
    user: Annotated[dict[str, object], Depends(get_current_user)],
    desde: Annotated[int, Query(ge=0)] = 0,
    limite: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        orders = connection.execute(
            "SELECT * FROM orders WHERE id > ? ORDER BY id ASC LIMIT ?",
            (desde, limite),
        ).fetchall()
    return [serialize_order(order) for order in orders]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderRequest,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    cliente = order.cliente.strip()
    producto = order.producto.strip()
    categoria = order.categoria.strip()
    if not cliente or not producto or not categoria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cliente, producto y categoría no pueden estar vacíos.",
        )

    created_at = datetime.now(timezone.utc).isoformat()
    with database.get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO orders (
                created_by, cliente, producto, categoria, total, estado, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                cliente,
                producto,
                categoria,
                order.total,
                order.estado,
                created_at,
            ),
        )
        saved_order = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return serialize_order(saved_order)
