import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parent.parent / "data" / "kermel.db"


class ConnectionContext:
    def __init__(self) -> None:
        self.connection: sqlite3.Connection | None = None

    def __enter__(self) -> sqlite3.Connection:
        DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(DATABASE_PATH)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        self.connection = connection
        return connection

    def __exit__(self, error_type, error, traceback) -> bool:
        if self.connection is not None:
            try:
                if error_type is None:
                    self.connection.commit()
                else:
                    self.connection.rollback()
            finally:
                self.connection.close()
        return False


def get_connection() -> ConnectionContext:
    return ConnectionContext()


def _get_columns(
    connection: sqlite3.Connection,
    table_name: str,
) -> set[str]:
    rows = connection.execute(
        f"PRAGMA table_info({table_name})"
    ).fetchall()
    return {row["name"] for row in rows}


def _add_column(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    definition: str,
) -> None:
    if column_name not in _get_columns(connection, table_name):
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"
        )


def _migrate_order_statuses(connection: sqlite3.Connection) -> None:
    table = connection.execute(
        """
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'orders'
        """
    ).fetchone()

    if table is None:
        return

    table_sql = table["sql"] or ""
    if "'Enviado'" in table_sql and "'Entregado'" in table_sql:
        return

    connection.execute(
        """
        CREATE TABLE orders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_by INTEGER NOT NULL REFERENCES users(id),
            cliente TEXT NOT NULL,
            producto TEXT NOT NULL,
            categoria TEXT NOT NULL,
            total INTEGER NOT NULL CHECK (total >= 0),
            estado TEXT NOT NULL CHECK (
                estado IN (
                    'Pendiente', 'Confirmado', 'Enviado',
                    'Entregado', 'Cancelado'
                )
            ),
            created_at TEXT NOT NULL
        )
        """
    )

    connection.execute(
        """
        INSERT INTO orders_new (
            id, created_by, cliente, producto, categoria,
            total, estado, created_at
        )
        SELECT
            id, created_by, cliente, producto, categoria, total,
            CASE estado
                WHEN 'Pagado' THEN 'Confirmado'
                ELSE estado
            END,
            created_at
        FROM orders
        """
    )

    connection.execute("DROP TABLE orders")
    connection.execute("ALTER TABLE orders_new RENAME TO orders")


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cliente'
                    CHECK (role IN ('cliente', 'admin'))
            )
            """
        )
        _add_column(
            connection,
            "users",
            "role",
            "TEXT NOT NULL DEFAULT 'cliente'",
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE COLLATE NOCASE,
                description TEXT
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                brand TEXT NOT NULL,
                price INTEGER NOT NULL CHECK (price >= 0),
                socket TEXT,
                stock INTEGER NOT NULL CHECK (stock >= 0),
                icon TEXT NOT NULL,
                specs TEXT NOT NULL,
                image TEXT,
                category_id INTEGER REFERENCES categories(id),
                reserved_stock INTEGER NOT NULL DEFAULT 0
                    CHECK (reserved_stock >= 0),
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1))
            )
            """
        )
        _add_column(connection, "products", "category_id", "INTEGER")
        _add_column(
            connection,
            "products",
            "reserved_stock",
            "INTEGER NOT NULL DEFAULT 0",
        )
        _add_column(
            connection,
            "products",
            "is_active",
            "INTEGER NOT NULL DEFAULT 1",
        )

        connection.execute(
            """
            INSERT OR IGNORE INTO categories (name)
            SELECT DISTINCT category
            FROM products
            WHERE trim(category) <> ''
            """
        )
        connection.execute(
            """
            UPDATE products
            SET category_id = (
                SELECT categories.id
                FROM categories
                WHERE categories.name = products.category COLLATE NOCASE
            )
            WHERE category_id IS NULL
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_by INTEGER NOT NULL REFERENCES users(id),
                cliente TEXT NOT NULL,
                producto TEXT NOT NULL,
                categoria TEXT NOT NULL,
                total INTEGER NOT NULL CHECK (total >= 0),
                estado TEXT NOT NULL CHECK (
                    estado IN (
                        'Pendiente', 'Confirmado', 'Enviado',
                        'Entregado', 'Cancelado'
                    )
                ),
                created_at TEXT NOT NULL
            )
            """
        )
        _migrate_order_statuses(connection)

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL REFERENCES orders(id),
                product_id INTEGER REFERENCES products(id),
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS carts (
                user_id INTEGER PRIMARY KEY
                    REFERENCES users(id) ON DELETE CASCADE,
                updated_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS cart_items (
                user_id INTEGER NOT NULL
                    REFERENCES carts(user_id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                PRIMARY KEY (user_id, product_id)
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER REFERENCES orders(id),
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0
                    CHECK (is_read IN (0, 1))
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )

        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_products_category "
            "ON products(category_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_user "
            "ON orders(created_by, id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_status "
            "ON orders(estado)"
        )
