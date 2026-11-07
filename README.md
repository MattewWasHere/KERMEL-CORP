# KERMEL CORP

Aplicación web para la gestión y venta de componentes tecnológicos. El proyecto
está dividido en una API backend y un frontend estático; ambos se ejecutan por
separado en desarrollo.

## Tecnologías

- **Backend:** Python 3.10 o superior, FastAPI y Uvicorn.
- **Base de datos:** SQLite. La API la inicializa y usa
  `backend/data/kermel.db` para guardar los datos.
- **Frontend:** HTML, CSS y JavaScript sin framework ni proceso de compilación.
- **Gráficos:** Chart.js 4.4.1, cargado desde jsDelivr en la página del panel.
- **Tipografía:** Inter, cargada desde Google Fonts.

No se necesita Node.js ni npm para ejecutar el frontend. Para cargar Chart.js y
Google Fonts en el navegador sí se necesita conexión a internet.

## Requisitos

- Python 3.10 o superior.
- Un navegador web moderno.
- Git, si vas a clonar el repositorio.

## Configuración inicial

Ejecuta estos pasos desde la carpeta raíz del proyecto.

### Linux o macOS

```bash
python3 --version
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
```

### Windows PowerShell

```powershell
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Si ya existe el entorno `.venv`, no hace falta volver a crearlo: instala o
actualiza las dependencias con el comando de `pip`.
En Linux, también puedes omitir la configuración manual y ejecutar `./start.sh`;
el script crea el entorno e instala las dependencias que falten.

## Iniciar la aplicación

### Linux: inicio automático

Desde la raíz del proyecto, ejecuta:

```bash
chmod +x start.sh
./start.sh
```

El script crea `.venv` si no existe, instala las dependencias del backend si
hacen falta e inicia la API y el frontend. Abre <http://127.0.0.1:5500> en el
navegador. La API y su documentación están en <http://127.0.0.1:8000> y
<http://127.0.0.1:8000/docs>. Pulsa `Ctrl+C` en la terminal para detener ambos
servicios.

### Inicio manual

Si prefieres arrancar los servicios por separado, sigue estos pasos. Necesitas
dos terminales abiertas en la raíz del proyecto: una para la API y otra para el
frontend.

### 1. Iniciar la API

En la primera terminal, entra a `backend` y ejecuta Uvicorn.

**Linux o macOS:**

```bash
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Windows PowerShell:**

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Deja esta terminal abierta mientras uses la aplicación. La API se inicia en
<http://127.0.0.1:8000>. Puedes comprobar que está activa en
<http://127.0.0.1:8000/api/health> y consultar sus endpoints en
<http://127.0.0.1:8000/docs>.

Al iniciar, la aplicación prepara la base de datos. En una instalación nueva,
el catálogo se importa desde `backend/data/products.json` si está disponible;
de lo contrario, utiliza el catálogo inicial definido por el backend. La base
de datos permanece en `backend/data/kermel.db`: no la borres si quieres
conservar los datos guardados.

### 2. Iniciar el frontend

Abre una segunda terminal en la raíz del proyecto y sirve la carpeta `frontend`
por HTTP.

**Linux o macOS:**

```bash
python3 -m http.server 5500 --directory frontend
```

**Windows PowerShell:**

```powershell
py -m http.server 5500 --directory frontend
```

Deja también esta terminal abierta. Abre <http://127.0.0.1:5500> en el
navegador; la página de inicio de sesión es `index.html`. Los clientes llegan
a la tienda (`store.html`) tras iniciar sesión; los administradores llegan al
panel de gestión (`Dashboard.html`). También puedes abrir `register.html` o
`admin.html` en la misma dirección, por ejemplo
<http://127.0.0.1:5500/register.html>.

No abras los archivos HTML directamente con `file://`: el frontend necesita un
origen HTTP para comunicarse correctamente con la API.

### 3. Detener los servidores

En cada terminal, pulsa `Ctrl+C`.

## Direcciones locales

| Servicio | Dirección |
| --- | --- |
| Frontend | <http://127.0.0.1:5500> |
| API | <http://127.0.0.1:8000> |
| Documentación de la API | <http://127.0.0.1:8000/docs> |
| Comprobación de salud | <http://127.0.0.1:8000/api/health> |

El frontend construye la dirección de la API con el mismo nombre de host que
usas para abrirlo y el puerto `8000`. Por eso, usa el mismo host en ambos
servicios (por ejemplo, `127.0.0.1` en los dos). La configuración CORS del
backend permite por defecto los puertos de frontend `5500` y `5501`.

Si necesitas usar otro puerto para el frontend, define
`KERMEL_ALLOWED_ORIGINS` con el origen completo antes de iniciar la API. Por
ejemplo, para el puerto `3000`:

**Linux o macOS:**

```bash
export KERMEL_ALLOWED_ORIGINS="http://127.0.0.1:3000,http://localhost:3000"
```

**Windows PowerShell:**

```powershell
$env:KERMEL_ALLOWED_ORIGINS = "http://127.0.0.1:3000,http://localhost:3000"
```

Después, inicia o reinicia la API desde esa misma terminal.

## Estructura principal

```text
backend/
  app/                 API FastAPI, rutas y lógica de la aplicación
  data/                Base SQLite y catálogo inicial
  requirements.txt     Dependencias del backend
frontend/
  controller/          Controladores y configuración de la API
  model/               Modelos del frontend
  view/                Vistas y estilos
  *.html               Login, registro, tienda y panel administrativo
```

La tienda conecta el catálogo, filtros, carrito, checkout, pedidos y
notificaciones de la API. El panel administrativo gestiona inventario,
productos, categorías y estados de pedidos. El registro público crea cuentas
de cliente; las cuentas con rol `admin` deben ser aprovisionadas por el
administrador del sistema y no se pueden crear desde el formulario público.
El catálogo administrativo usa `GET /api/products/admin`, que requiere sesión
de administrador y devuelve el stock total y el reservado para que las
actualizaciones de inventario no confundan disponibilidad con unidades físicas.

Consulta la [guía de integración del frontend y el backend](./GUIA-INTEGRACION-FRONTEND-BACKEND.md)
para ver el flujo del panel, los campos de productos, las rutas disponibles y
las reglas del inventario y los pedidos.