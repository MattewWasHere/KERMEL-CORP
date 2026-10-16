# API de KERMEL CORP

API sencilla con FastAPI y SQLite. La base de datos se crea automáticamente en
`backend/data/kermel.db` al iniciar el servidor.

## Iniciar

Desde esta carpeta, crea un entorno virtual, instala dependencias e inicia el
servidor:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

En Windows, activa el entorno con `.venv\Scripts\activate`.

Para instalar dependencias de pruebas y ejecutar la suite automatizada:

```bash
pip install -r requirements-dev.txt
pytest -q
```

También puedes iniciar el servidor directamente desde la carpeta del proyecto:

```bash
.venv/bin/python backend/app/main.py
```

En Windows, usa `.venv\Scripts\python.exe backend\app\main.py`.

- API: <http://127.0.0.1:8000>
- Documentación interactiva: <http://127.0.0.1:8000/docs>
- Comprobación: `GET /api/health`
- Registro: `POST /api/auth/register` con `{ "name": "...", "email": "...", "password": "..." }`
- Inicio de sesión: `POST /api/auth/login` con `{ "username": "nombre o correo", "password": "..." }`

El frontend debe abrirse mediante un servidor local (por ejemplo, Live Server
en el puerto 5500), no directamente como archivo. Para cambiar el puerto
permitido, edita la configuración CORS en `app/main.py`.
