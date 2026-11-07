import sqlite3
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import database
from app.schemas import OrderStatusChange
from app.security import get_current_admin, get_current_user


router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

NEXT_STATUS = {
    "Pendiente": "Confirmado",
    "Confirmado": "Enviado",
    "Enviado": "Entregado",
}


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


def my_orders(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM orders
            WHERE created_by = ?
            ORDER BY id DESC
            """,
            (int(user["id"]),),
        ).fetchall()
    return [serialize_order(row) for row in rows]


def recent_orders(
    _: Annotated[dict[str, object], Depends(get_current_admin)],
    limit: Annotated[int, Query(ge=1, le=100)] = 12,
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM orders ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [serialize_order(row) for row in rows]


def orders_since(
    _: Annotated[dict[str, object], Depends(get_current_admin)],
    since: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM orders
            WHERE id > ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (since, limit),
        ).fetchall()
    return [serialize_order(row) for row in rows]


def create_order(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    user_id = int(user["id"])
    now = datetime.now(timezone.utc).isoformat()

    with database.get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        items = connection.execute(
            """
            SELECT
                products.id,
                products.name,
                products.category,
                products.price,
                cart_items.quantity,
                products.stock - products.reserved_stock AS available
            FROM cart_items
            JOIN products ON products.id = cart_items.product_id
            WHERE cart_items.user_id = ? AND products.is_active = 1
            """,
            (user_id,),
        ).fetchall()

        if not items:
            raise HTTPException(status_code=400, detail="El carrito está vacío.")

        for item in items:
            if item["quantity"] > item["available"]:
                raise HTTPException(
                    status_code=409,
                    detail=f"Stock insuficiente para {item['name']}.",
                )

        total = sum(item["price"] * item["quantity"] for item in items)
        product_names = ", ".join(item["name"] for item in items)
        categories = ", ".join(sorted({item["category"] for item in items}))

        cursor = connection.execute(
            """
            INSERT INTO orders (
                created_by, cliente, producto, categoria,
                total, estado, created_at
            )
            VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)
            """,
            (
                user_id,
                str(user["username"]),
                product_names,
                categories,
                total,
                now,
            ),
        )
        order_id = cursor.lastrowid

        for item in items:
            connection.execute(
                """
                INSERT INTO order_items (
                    order_id, product_id, product_name, quantity, unit_price
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    order_id,
                    item["id"],
                    item["name"],
                    item["quantity"],
                    item["price"],
                ),
            )
            connection.execute(
                """
                UPDATE products
                SET reserved_stock = reserved_stock + ?
                WHERE id = ?
                """,
                (item["quantity"], item["id"]),
            )

        connection.execute(
            "DELETE FROM cart_items WHERE user_id = ?",
            (user_id,),
        )
        connection.execute(
            """
            INSERT INTO notifications (
                user_id, order_id, message, created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (user_id, order_id, "Tu pedido fue registrado como pendiente.", now),
        )
        order = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

    result = serialize_order(order)
    result["items"] = [
        {
            "product": item["name"],
            "quantity": item["quantity"],
            "unit_price": item["price"],
            "subtotal": item["price"] * item["quantity"],
        }
        for item in items
    ]
    return result


def get_order(
    order_id: int,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    with database.get_connection() as connection:
        order = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

        if order is None:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")

        if user["role"] != "admin" and order["created_by"] != int(user["id"]):
            raise HTTPException(
                status_code=403,
                detail="No puedes consultar este pedido.",
            )

        items = connection.execute(
            """
            SELECT product_name, quantity, unit_price
            FROM order_items
            WHERE order_id = ?
            """,
            (order_id,),
        ).fetchall()

    result = serialize_order(order)
    result["items"] = [
        {
            **dict(item),
            "subtotal": item["quantity"] * item["unit_price"],
        }
        for item in items
    ]
    return result


def update_order_status(
    order_id: int,
    data: OrderStatusChange,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> dict[str, object]:
    now = datetime.now(timezone.utc).isoformat()

    with database.get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        order = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

        if order is None:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")

        if data.estado != NEXT_STATUS.get(order["estado"]):
            raise HTTPException(
                status_code=409,
                detail=f"Transición no permitida desde {order['estado']}.",
            )

        if order["estado"] == "Pendiente":
            items = connection.execute(
                """
                SELECT product_id, quantity
                FROM order_items
                WHERE order_id = ?
                """,
                (order_id,),
            ).fetchall()

            for item in items:
                product = connection.execute(
                    """
                    SELECT stock, reserved_stock
                    FROM products
                    WHERE id = ?
                    """,
                    (item["product_id"],),
                ).fetchone()

                if (
                    product is None
                    or product["stock"] < item["quantity"]
                    or product["reserved_stock"] < item["quantity"]
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="No hay existencias suficientes para confirmar.",
                    )

                connection.execute(
                    """
                    UPDATE products
                    SET stock = stock - ?,
                        reserved_stock = reserved_stock - ?
                    WHERE id = ?
                    """,
                    (item["quantity"], item["quantity"], item["product_id"]),
                )

        connection.execute(
            "UPDATE orders SET estado = ? WHERE id = ?",
            (data.estado, order_id),
        )
        connection.execute(
            """
            INSERT INTO notifications (
                user_id, order_id, message, created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                order["created_by"],
                order_id,
                f"El estado de tu pedido cambió a {data.estado}.",
                now,
            ),
        )
        updated = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

    return serialize_order(updated)


def cancel_order(
    order_id: int,
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> dict[str, object]:
    now = datetime.now(timezone.utc).isoformat()

    with database.get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        order = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

        if order is None:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")

        is_admin = user["role"] == "admin"
        is_owner = order["created_by"] == int(user["id"])

        if not is_admin and not is_owner:
            raise HTTPException(
                status_code=403,
                detail="No puedes cancelar este pedido.",
            )

        if order["estado"] != "Pendiente":
            raise HTTPException(
                status_code=409,
                detail="El pedido no puede ser cancelado en su estado actual.",
            )

        items = connection.execute(
            """
            SELECT product_id, quantity
            FROM order_items
            WHERE order_id = ?
            """,
            (order_id,),
        ).fetchall()

        for item in items:
            connection.execute(
                """
                UPDATE products
                SET reserved_stock = reserved_stock - ?
                WHERE id = ? AND reserved_stock >= ?
                """,
                (item["quantity"], item["product_id"], item["quantity"]),
            )

        connection.execute(
            "UPDATE orders SET estado = 'Cancelado' WHERE id = ?",
            (order_id,),
        )
        connection.execute(
            """
            INSERT INTO notifications (
                user_id, order_id, message, created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (order["created_by"], order_id, "Tu pedido fue cancelado.", now),
        )
        cancelled = connection.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

    return serialize_order(cancelled)


def my_notifications(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> list[dict[str, object]]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, order_id, message, created_at, is_read
            FROM notifications
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (int(user["id"]),),
        ).fetchall()
    return [dict(row) for row in rows]


router.add_api_route("/mis-pedidos", my_orders, methods=["GET"])
router.add_api_route("/recientes", recent_orders, methods=["GET"])
router.add_api_route("", orders_since, methods=["GET"])
router.add_api_route(
    "",
    create_order,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route("/notificaciones", my_notifications, methods=["GET"])
router.add_api_route("/{order_id}", get_order, methods=["GET"])
router.add_api_route("/{order_id}/estado", update_order_status, methods=["PATCH"])
router.add_api_route("/{order_id}/cancelar", cancel_order, methods=["POST"])
