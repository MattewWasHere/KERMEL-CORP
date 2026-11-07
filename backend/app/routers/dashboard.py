from fastapi import APIRouter, Depends

from app import database
from app.security import get_current_admin


router = APIRouter(
    prefix="/api/admin/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_admin)],
)


def inventory_dashboard() -> dict[str, object]:
    with database.get_connection() as connection:
        summary = connection.execute(
            """
            SELECT
                COUNT(*) AS total_productos,
                COUNT(DISTINCT category_id) AS total_categorias,
                COALESCE(SUM(stock - reserved_stock), 0)
                    AS unidades_disponibles,
                COALESCE(SUM(stock), 0) AS unidades_totales,
                COALESCE(SUM(price * stock), 0) AS valor_inventario,
                COALESCE(
                    SUM(
                        CASE
                            WHEN stock - reserved_stock = 0 THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS productos_agotados
            FROM products
            WHERE is_active = 1
            """
        ).fetchone()

        categories = connection.execute(
            """
            SELECT
                categories.name AS categoria,
                SUM(products.stock - products.reserved_stock) AS unidades
            FROM products
            JOIN categories ON categories.id = products.category_id
            WHERE products.is_active = 1
            GROUP BY categories.id
            ORDER BY categories.name
            """
        ).fetchall()

    return {
        **dict(summary),
        "stock_por_categoria": [dict(row) for row in categories],
    }


router.add_api_route("/inventory", inventory_dashboard, methods=["GET"])



