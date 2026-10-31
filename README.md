# KERMEL CORP

Aplicación web con frontend en JavaScript, API FastAPI y base de datos SQLite.

## Requisitos

- Python 3.10 o posterior.
- Windows 10/11, Linux o macOS.

## Preparación inicial

Abre una terminal en la raíz del proyecto y crea un entorno virtual. Puedes
guardar el entorno en la raíz o dentro de `backend/`; los lanzadores detectan
ambas ubicaciones.

### Windows (PowerShell)

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
```

### Linux o macOS

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r backend/requirements-dev.txt
```

## Iniciar frontend y backend

Desde la raíz del proyecto, ejecuta el lanzador de tu sistema:


Los lanzadores inician FastAPI y un servidor local para el frontend. Si no
encuentran las dependencias, muestran el comando para instalarlas. Deja
abiertas las ventanas/terminales mientras uses la aplicación. En Linux/macOS,
`Ctrl+C` detiene ambos servicios; en Windows, cierra ambas ventanas.

- Aplicación: <http://127.0.0.1:5500>
- API: <http://127.0.0.1:8000>
- Documentación: <http://127.0.0.1:8000/docs>

Si prefieres iniciarlos manualmente, abre dos terminales.

```bash
# Terminal 1 (Linux/macOS), desde la raíz del proyecto
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload
```

```bash
# Terminal 2 (Linux/macOS), desde la raíz del proyecto
python -m http.server 5500 --bind 127.0.0.1 --directory frontend
```

En Windows, desde CMD o PowerShell, la primera terminal puede iniciar la API
así:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

En la segunda terminal, desde la raíz del proyecto, inicia el frontend:

```powershell
py -3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
```

Si creaste el entorno virtual dentro de `backend/`, reemplaza la ruta del
ejecutable por `.venv\Scripts\python.exe` desde esa carpeta.

## Pruebas

Desde `backend/`, con el entorno virtual de la raíz del proyecto:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

```bash
../.venv/bin/python -m pytest -q
```

Si el entorno virtual está en `backend/.venv`, usa `.venv\Scripts\python.exe`
en Windows o `.venv/bin/python` en Linux/macOS.

## Datos

La base de datos persistente está en `backend/data/kermel.db`. No la elimines
si necesitas conservar las cuentas, pedidos y productos. El catálogo JSON se
importa a SQLite la primera vez; el archivo `backend/data/products.json` se
mantiene como respaldo inicial.

Para detalles de endpoints y el funcionamiento de la API, consulta
[backend/README.md](backend/README.md).
