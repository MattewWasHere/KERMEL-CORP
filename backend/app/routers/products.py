import json
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import database
from app.schemas import ProductCreate, ProductUpdate
from app.security import get_current_admin


router = APIRouter(prefix="/api/products", tags=["productos"])


def serialize_product(product: sqlite3.Row) -> dict[str, object]:
    return {
        "id": product["id"],
        "name": product["name"],
        "category": product["category"],
        "category_id": product["category_id"],
        "brand": product["brand"],
        "price": product["price"],
        "socket": product["socket"],
        "stock": product["stock"] - product["reserved_stock"],
        "icon": product["icon"],
        "specs": json.loads(product["specs"]),
        "image": product["image"],
    }


def list_products(
    category_id: int | None = None,
    brand: str | None = None,
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    search: str | None = None,
) -> list[dict[str, object]]:
    sql = """
        SELECT products.*, categories.name AS category
        FROM products
        LEFT JOIN categories ON categories.id = products.category_id
        WHERE products.is_active = 1
    """
    values: list[object] = []

    if category_id is not None:
        sql += " AND products.category_id = ?"
        values.append(category_id)
    if brand:
        sql += " AND products.brand = ?"
        values.append(brand)
    if min_price is not None:
        sql += " AND products.price >= ?"
        values.append(min_price)
    if max_price is not None:
        sql += " AND products.price <= ?"
        values.append(max_price)
    if search:
        sql += " AND products.name LIKE ?"
        values.append(f"%{search.strip()}%")

    sql += " ORDER BY products.id"

    with database.get_connection() as connection:
        rows = connection.execute(sql, values).fetchall()
    return [serialize_product(row) for row in rows]


def get_product(product_id: int) -> dict[str, object]:
    with database.get_connection() as connection:
        product = connection.execute(
            """
            SELECT products.*, categories.name AS category
            FROM products
            LEFT JOIN categories ON categories.id = products.category_id
            WHERE products.id = ? AND products.is_active = 1
            """,
            (product_id,),
        ).fetchone()

    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    return serialize_product(product)


def save_product(
    data: ProductCreate,
    product_id: int | None = None,
) -> dict[str, object]:
    name = data.name.strip()
    brand = data.brand.strip()

    if not name or not brand:
        raise HTTPException(
            status_code=400,
            detail="El nombre y la marca son obligatorios.",
        )

    with database.get_connection() as connection:
        category = connection.execute(
            "SELECT id, name FROM categories WHERE id = ?",
            (data.category_id,),
        ).fetchone()

        if category is None:
            raise HTTPException(status_code=400, detail="Categoría no encontrada.")

        values = (
            name,
            category["name"],
            brand,
            data.price,
            data.socket,
            data.stock,
            data.icon,
            json.dumps(data.specs, ensure_ascii=False),
            data.image,
            data.category_id,
        )

        if product_id is None:
            cursor = connection.execute(
                """
                INSERT INTO products (
                    name, category, brand, price, socket, stock,
                    icon, specs, image, category_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                values,
            )
            product_id = cursor.lastrowid
        else:
            current = connection.execute(
                """
                SELECT reserved_stock
                FROM products
                WHERE id = ? AND is_active = 1
                """,
                (product_id,),
            ).fetchone()

            if current is None:
                raise HTTPException(
                    status_code=404,
                    detail="Producto no encontrado.",
                )

            if data.stock < current["reserved_stock"]:
                raise HTTPException(
                    status_code=409,
                    detail="El stock no puede ser menor que las unidades reservadas.",
                )

            connection.execute(
                """
                UPDATE products SET
                    name = ?, category = ?, brand = ?, price = ?,
                    socket = ?, stock = ?, icon = ?, specs = ?,
                    image = ?, category_id = ?
                WHERE id = ?
                """,
                (*values, product_id),
            )

        product = connection.execute(
            """
            SELECT products.*, categories.name AS category
            FROM products
            LEFT JOIN categories ON categories.id = products.category_id
            WHERE products.id = ?
            """,
            (product_id,),
        ).fetchone()

    return serialize_product(product)


def create_product(
    data: ProductCreate,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> dict[str, object]:
    return save_product(data)


def update_product(
    product_id: int,
    data: ProductUpdate,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> dict[str, object]:
    return save_product(data, product_id)


def delete_product(
    product_id: int,
    _: Annotated[dict[str, object], Depends(get_current_admin)],
) -> None:
    with database.get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE products
            SET is_active = 0
            WHERE id = ? AND is_active = 1
            """,
            (product_id,),
        )

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")


router.add_api_route("", list_products, methods=["GET"])
router.add_api_route("/{product_id}", get_product, methods=["GET"])
router.add_api_route(
    "",
    create_product,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route("/{product_id}", update_product, methods=["PUT"])
router.add_api_route(
    "/{product_id}",
    delete_product,
    methods=["DELETE"],
    status_code=status.HTTP_204_NO_CONTENT,
)