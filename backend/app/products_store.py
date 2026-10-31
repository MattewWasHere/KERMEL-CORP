import json
from pathlib import Path

from app import database


PRODUCTS_PATH = Path(__file__).resolve().parent.parent / "data" / "products.json"

# Productos iniciales para instalaciones nuevas que no tengan un catálogo JSON
# anterior que importar.
# Formato: (nombre, categoría, marca, precio, socket, stock, icono, especificaciones)
SEED_PRODUCTS = [
    # Procesadores
    ("Ryzen 5 5600", "Procesador", "AMD", 520000, "AM4", 12, "🧠", ["6 núcleos / 12 hilos", "Hasta 4.4 GHz"]),
    ("Ryzen 7 7700X", "Procesador", "AMD", 1350000, "AM5", 5, "🧠", ["8 núcleos / 16 hilos", "Hasta 5.4 GHz"]),
    ("Core i5-12400F", "Procesador", "Intel", 620000, "LGA1700", 8, "🧠", ["6 núcleos / 12 hilos", "Hasta 4.4 GHz"]),
    ("Core i7-14700K", "Procesador", "Intel", 1900000, "LGA1700", 0, "🧠", ["20 núcleos / 28 hilos", "Hasta 5.6 GHz"]),
    # Tarjetas madre
    ("TUF Gaming B550-PLUS", "Tarjeta madre", "ASUS", 780000, "AM4", 6, "🔌", ["ATX", "DDR4 / PCIe 4.0"]),
    ("MAG B650 Tomahawk", "Tarjeta madre", "MSI", 1100000, "AM5", 3, "🔌", ["ATX", "DDR5 / PCIe 5.0"]),
    ("B760M Aorus Elite", "Tarjeta madre", "Gigabyte", 680000, "LGA1700", 0, "🔌", ["Micro-ATX", "DDR5 / PCIe 4.0"]),
    # Tarjetas de video
    ("GeForce RTX 4060 Ventus", "Tarjeta de video", "MSI", 1650000, None, 7, "🎮", ["8 GB GDDR6", "Ray Tracing / DLSS 3"]),
    ("GeForce RTX 4070 Dual", "Tarjeta de video", "ASUS", 2900000, None, 0, "🎮", ["12 GB GDDR6X", "Ray Tracing / DLSS 3"]),
    ("Radeon RX 7600 Gaming OC", "Tarjeta de video", "Gigabyte", 1300000, None, 4, "🎮", ["8 GB GDDR6", "FSR 3 / PCIe 4.0"]),
    # Memoria RAM
    ("Vengeance DDR5 32GB (2x16)", "Memoria RAM", "Corsair", 480000, None, 15, "💾", ["DDR5 6000 MHz", "CL36"]),
    ("Fury Beast DDR4 16GB (2x8)", "Memoria RAM", "Kingston", 190000, None, 2, "💾", ["DDR4 3200 MHz", "CL16"]),
    # Almacenamiento
    ("980 NVMe 1TB", "Almacenamiento", "Samsung", 320000, None, 20, "💽", ["M.2 PCIe 3.0", "Hasta 3500 MB/s"]),
    ("Blue SN580 500GB", "Almacenamiento", "Western Digital", 190000, None, 0, "💽", ["M.2 PCIe 4.0", "Hasta 4000 MB/s"]),
    # Fuentes de poder
    ("CV650 650W", "Fuente de poder", "Corsair", 290000, None, 9, "⚡", ["80 Plus Bronze", "No modular"]),
    # Refrigeración
    ("Hyper 212 Black", "Refrigeración", "Cooler Master", 130000, None, 14, "❄️", ["Disipador por aire", "Ventilador 120 mm"]),
    # Gabinetes
    ("H510 Mid Tower", "Gabinete", "NZXT", 380000, None, 3, "🖥️", ["ATX", "Panel de vidrio templado"]),
    ("Pure Base 500", "Gabinete", "be quiet!", 450000, None, 6, "🖥️", ["ATX", "Flujo de aire optimizado"]),
]


def _build_seed() -> list[dict]:
    return [
        {
            "id": index,
            "name": name,
            "category": category,
            "brand": brand,
            "price": price,
            "socket": socket,
            "stock": stock,
            "icon": icon,
            "specs": specs,
            "image": None,
        }
        for index, (name, category, brand, price, socket, stock, icon, specs)
        in enumerate(SEED_PRODUCTS, start=1)
    ]


def initialize_products() -> None:
    with database.get_connection() as connection:
        initialized = connection.execute(
            "SELECT 1 FROM app_metadata WHERE key = ?",
            ("products_initialized",),
        ).fetchone()

        if initialized:
            return

        existing_products = connection.execute(
            "SELECT 1 FROM products LIMIT 1"
        ).fetchone()

        if existing_products:
            connection.execute(
                "INSERT INTO app_metadata (key, value) VALUES (?, ?)",
                ("products_initialized", "true"),
            )
            return

        if PRODUCTS_PATH.exists():
            with PRODUCTS_PATH.open(encoding="utf-8") as products_file:
                products = json.load(products_file)
        else:
            products = _build_seed()

        for product in products:
            category_name = product["category"].strip()
            connection.execute(
                "INSERT OR IGNORE INTO categories (name) VALUES (?)",
                (category_name,),
            )
            category = connection.execute(
                "SELECT id FROM categories WHERE name = ? COLLATE NOCASE",
                (category_name,),
            ).fetchone()

            connection.execute(
                """
                INSERT INTO products (
                    id, name, category, brand, price, socket, stock,
                    icon, specs, image, category_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    product["id"],
                    product["name"],
                    category_name,
                    product["brand"],
                    product["price"],
                    product.get("socket"),
                    product["stock"],
                    product["icon"],
                    json.dumps(product["specs"], ensure_ascii=False),
                    product.get("image"),
                    category["id"],
                ),
            )

        connection.execute(
            "INSERT INTO app_metadata (key, value) VALUES (?, ?)",
            ("products_initialized", "true"),
        )


def load_products() -> list[dict]:
    with database.get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id, name, category, category_id, brand, price,
                socket, stock, reserved_stock, icon, specs, image
            FROM products
            WHERE is_active = 1
            ORDER BY id
            """
        ).fetchall()

    return [
        {
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
        for product in rows
    ]