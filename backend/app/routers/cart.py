from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app import database
from app.schemas import CartItemAdd, CartItemChange
from app.security import get_current_user


router = APIRouter(prefix="/api/cart", tags=["carrito"])


def get_user_id(user: dict[str, object]) -> int:
    return int(user["id"])


def get_cart(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                products.id AS product_id,
                products.name,
                products.price,
                products.stock - products.reserved_stock AS available_stock,
                cart_items.quantity
            FROM cart_items
            JOIN products ON products.id = cart_items.product_id
            WHERE cart_items.user_id = ? AND products.is_active = 1
            ORDER BY products.name
            """,
            (get_user_id(user),),
        ).fetchall()

    items = [
        {
            **dict(row),
            "subtotal": row["price"] * row["quantity"],
        }
        for row in rows
    ]
    return {
        "items": items,
        "total": sum(item["subtotal"] for item in items),
    }


def add_cart_item(
    data: CartItemAdd,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, str]:
    user_id = get_user_id(user)
    now = datetime.now(timezone.utc).isoformat()

    with database.get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        product = connection.execute(
            """
            SELECT stock - reserved_stock AS available
            FROM products
            WHERE id = ? AND is_active = 1
            """,
            (data.product_id,),
        ).fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Producto no encontrado.")

        current = connection.execute(
            """
            SELECT quantity FROM cart_items
            WHERE user_id = ? AND product_id = ?
            """,
            (user_id, data.product_id),
        ).fetchone()

        quantity = data.quantity
        if current is not None:
            quantity += current["quantity"]

        if quantity > product["available"]:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente. Disponibles: {product['available']}.",
            )

        connection.execute(
            "INSERT OR IGNORE INTO carts (user_id, updated_at) VALUES (?, ?)",
            (user_id, now),
        )
        connection.execute(
            """
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, product_id)
            DO UPDATE SET quantity = excluded.quantity
            """,
            (user_id, data.product_id, quantity),
        )
        connection.execute(
            "UPDATE carts SET updated_at = ? WHERE user_id = ?",
            (now, user_id),
        )

    return {"message": "Producto agregado al carrito."}


def update_cart_item(
    product_id: int,
    data: CartItemChange,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, str]:
    user_id = get_user_id(user)

    with database.get_connection() as connection:
        product = connection.execute(
            """
            SELECT stock - reserved_stock AS available
            FROM products
            WHERE id = ? AND is_active = 1
            """,
            (product_id,),
        ).fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Producto no encontrado.")

        if data.quantity > product["available"]:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente. Disponibles: {product['available']}.",
            )

        cursor = connection.execute(
            """
            UPDATE cart_items
            SET quantity = ?
            WHERE user_id = ? AND product_id = ?
            """,
            (data.quantity, user_id, product_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="El producto no está en el carrito.",
            )

    return {"message": "Cantidad actualizada."}


def remove_cart_item(
    product_id: int,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> None:
    with database.get_connection() as connection:
        connection.execute(
            """
            DELETE FROM cart_items
            WHERE user_id = ? AND product_id = ?
            """,
            (get_user_id(user), product_id),
        )


router.add_api_route("", get_cart, methods=["GET"])
router.add_api_route("/items", add_cart_item, methods=["POST"])
router.add_api_route("/items/{product_id}", update_cart_item, methods=["PATCH"])
router.add_api_route(
    "/items/{product_id}",
    remove_cart_item,
    methods=["DELETE"],
    status_code=status.HTTP_204_NO_CONTENT,
)
