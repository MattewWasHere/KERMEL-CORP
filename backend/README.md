# API de KERMEL CORP

API sencilla con FastAPI y SQLite. La base de datos se crea automáticamente en
`backend/data/kermel.db` al iniciar el servidor.

## Iniciar

Desde la raíz del proyecto, crea un entorno virtual e instala dependencias:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

En Windows, activa el entorno con `.venv\Scripts\activate`.

Desde la raíz del proyecto, inicia el servidor:

```bash
cd backend
uvicorn app.main:app --reload
```

También puedes iniciar el servidor desde `backend` con `python -m app.main`.

Para instalar dependencias de pruebas y ejecutar la suite automatizada:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

- API: <http://127.0.0.1:8000>
- Documentación interactiva: <http://127.0.0.1:8000/docs>
- Comprobación: `GET /api/health`
- Registro: `POST /api/auth/register` con `{ "name": "...", "email": "...", "password": "..." }`
- Inicio de sesión: `POST /api/auth/login` con `{ "username": "nombre o correo", "password": "..." }`

El frontend está en `../frontend` y también se sirve desde la API. Si deseas
abrirlo por separado, usa un servidor local (por ejemplo, Live Server en el
puerto 5500), no directamente como archivo. Para cambiar el puerto permitido,
edita la lista `ALLOWED_ORIGINS` en `app/config.py`.

La API está organizada por responsabilidad en `app/routers/`, con modelos de
entrada en `app/schemas.py`, configuración en `app/config.py` y utilidades de
sesión y contraseñas en `app/security.py`.
