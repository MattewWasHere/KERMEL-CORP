# API de KERMEL CORP

API FastAPI con SQLite. La base de datos se crea automáticamente en
`backend/data/kermel.db` al iniciar el servidor.

Para instalar y lanzar el frontend y el backend juntos en Windows o Linux,
consulta el [README principal](../README.md). Los comandos de esta página
sirven para trabajar únicamente con la API o ejecutar sus pruebas.

## Iniciar solo la API

Desde la carpeta `backend/`, usa el Python del entorno virtual del proyecto:

```bash
# Linux/macOS, con .venv en la raíz
../.venv/bin/python -m uvicorn app.main:app --reload
```

```powershell
# Windows, con .venv en la raíz
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Si el entorno virtual está dentro de `backend/`, usa `.venv/bin/python` en
Linux/macOS o `.venv\Scripts\python.exe` en Windows.

- API: <http://127.0.0.1:8000>
- Documentación: <http://127.0.0.1:8000/docs>
- Comprobación: `GET /api/health`
- Catálogo: `GET /api/products`

## Datos

Los usuarios, las sesiones, los pedidos y los productos se guardan en la base
de datos persistente `backend/data/kermel.db`. No elimines ese archivo si
necesitas conservar los datos.

En el primer inicio, el catálogo se importa desde `backend/data/products.json`.
La importación ocurre una sola vez; después SQLite es la fuente de verdad y el
JSON sirve como respaldo de los datos iniciales.

## Pruebas

Desde la carpeta `backend/`:

```bash
# Linux/macOS, con .venv en la raíz
../.venv/bin/python -m pytest -q
```

```powershell
# Windows, con .venv en la raíz
..\.venv\Scripts\python.exe -m pytest -q
```

Si el entorno está dentro de `backend/`, reemplaza el ejecutable por
`.venv/bin/python` o `.venv\Scripts\python.exe`, según el sistema.
