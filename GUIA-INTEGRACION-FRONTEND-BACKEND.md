# Guía de integración del frontend y el backend

Este documento describe cómo iniciar KERMEL CORP, qué funcionalidades están
conectadas a la API y cómo opera el panel administrativo. El frontend usa HTML,
CSS y JavaScript sin proceso de compilación; la API es FastAPI y guarda los
datos en SQLite.

## Cambios de integración incluidos

- El login envía las credenciales a la API, comprueba la cookie de sesión con
  `GET /api/auth/me` y redirige según el rol: clientes a la tienda y
  administradores al panel. Si las credenciales funcionan pero la sesión no se
  conserva, el mensaje indica el origen y la URL de API que se deben revisar.
- Se retiró del login público el enlace **Acceso administrador**. El formulario
  administrativo existente en `frontend/admin.html` sigue disponible para uso
  directo; un administrador también puede entrar desde el login normal.
- Las solicitudes del frontend incluyen credenciales para enviar la cookie
  HTTP-only. El cliente de API procesa respuestas JSON y respuestas `204` sin
  contenido.
- La tienda (`frontend/store.html`) conecta catálogo, búsqueda, filtros,
  carrito, creación y consulta de pedidos, cancelación de pedidos y
  notificaciones.
- El panel (`frontend/Dashboard.html`) valida el rol antes de mostrar datos y
  conecta el resumen de inventario, productos, categorías y pedidos.
- En el inventario administrativo se distinguen stock total, unidades
  reservadas y disponibles. Se puede buscar por nombre, marca o categoría y
  consultar el detalle de cada pedido.
- Los formularios de login, registro, productos y categorías muestran
  validaciones en español para campos vacíos, formatos incorrectos, límites y
  confirmación de contraseña.
- La API expone un listado administrativo de productos que incluye el stock
  total y reservado, manteniendo el stock disponible en el campo `stock`.

## Iniciar en Windows

Abre dos terminales desde la raíz del proyecto.

En la primera, inicia la API:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En la segunda, sirve el frontend:

```powershell
py -m http.server 5500 --directory frontend
```

Abre <http://127.0.0.1:5500>. No abras las páginas como archivos `file://`.
Para autenticación con cookie, utiliza el mismo host en ambas direcciones; por
ejemplo, `127.0.0.1` para el frontend y `127.0.0.1` para la API.

Los valores predeterminados del backend permiten los orígenes HTTP de los
puertos `5500` y `5501`. Si usas otro puerto, configura el origen exacto en la
misma terminal desde la que inicias FastAPI y reinicia el servidor:

```powershell
$env:KERMEL_ALLOWED_ORIGINS = "http://127.0.0.1:5500,http://localhost:5500"
$env:KERMEL_COOKIE_SECURE = "false"
```

`KERMEL_COOKIE_SECURE=false` es únicamente para desarrollo HTTP. En producción
se debe servir todo por HTTPS y activar cookies seguras.

## Acceder al panel administrativo

Las cuentas nuevas del registro público reciben el rol `cliente`. No existe un
endpoint público para crear administradores: las cuentas con rol `admin` deben
ser aprovisionadas por el administrador del sistema en un proceso controlado.

Un administrador puede iniciar sesión desde `index.html`; el frontend consulta
el rol en la API y lo dirige al panel. `admin.html` se conserva como entrada
directa al formulario administrativo, aunque ya no se enlaza desde el login
público. El backend protege los datos y las operaciones administrativas:
ocultar una página o un botón nunca sustituye esa autorización.

## Funcionalidades del panel y contrato de la API

| Área | Funcionalidad del frontend | Rutas utilizadas |
| --- | --- | --- |
| Sesión | Validar cuenta/rol y cerrar sesión | `GET /api/auth/me`, `POST /api/auth/logout` |
| Inventario | Totales, valor, productos agotados y unidades disponibles por categoría | `GET /api/admin/dashboard/inventory` |
| Productos | Listar, buscar, crear, editar y desactivar | `GET /api/products/admin`, `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}` |
| Categorías | Listar, crear y editar | `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/{id}` |
| Pedidos | Ver recientes, consultar detalle, actualizar estado, cancelar y recibir pedidos nuevos | `GET /api/pedidos/recientes`, `GET /api/pedidos/{id}`, `PATCH /api/pedidos/{id}/estado`, `POST /api/pedidos/{id}/cancelar`, `GET /api/pedidos?since=...` |

Las rutas de consulta pública del catálogo son `GET /api/products`,
`GET /api/products/{id}` y `GET /api/categories`. El resto de escrituras de
productos y categorías requiere una sesión de administrador.

### Crear o editar productos

En la sección **Productos**, completa el nombre, marca, categoría, precio y
stock total. El socket y el icono son opcionales; las especificaciones se
ingresan una por línea y la imagen se proporciona como URL. Al guardar, el
frontend envía un JSON similar a:

```json
{
  "name": "Ejemplo de producto",
  "brand": "Marca",
  "category_id": 1,
  "price": 120000,
  "stock": 10,
  "socket": null,
  "icon": "📦",
  "specs": ["Especificación uno", "Especificación dos"],
  "image": null
}
```

El backend valida el nombre (hasta 120 caracteres), marca (hasta 80), categoría
existente, precio y stock como enteros no negativos, socket (hasta 40), icono
(hasta 20) y especificaciones como lista. En una actualización, el stock total
no puede ser menor que las unidades reservadas en pedidos pendientes; la API
responde `409` si se intenta hacer ese cambio.

El listado administrativo devuelve:

- `stock_total`: unidades físicas registradas;
- `reserved_stock`: unidades reservadas por pedidos pendientes;
- `stock`: unidades disponibles, calculadas como
  `stock_total - reserved_stock`.

El formulario de edición usa el stock total, no el disponible. **Desactivar**
usa `DELETE /api/products/{id}`, que marca el producto inactivo; no lo borra
físicamente de la base de datos. No hay carga de archivos de imagen: el
formulario solo guarda una URL.

### Categorías

Se pueden crear y editar nombre y descripción. Los nombres duplicados generan
un error `409`. Al cambiar el nombre, el backend actualiza la categoría
asociada a sus productos. El backend actual no ofrece una operación para
eliminar categorías.

### Inventario y pedidos

El resumen administrativo distingue unidades totales de unidades disponibles.
Cuando se registra un pedido, el backend reserva las unidades y descuenta esa
reserva de la disponibilidad. Al marcar el pedido como **Confirmado**, el
backend descuenta del stock tanto las unidades vendidas como las reservadas.
Los estados posteriores permitidos son **Enviado** y **Entregado**. Los pedidos
**Pendientes** pueden cancelarse; la cancelación libera las unidades
reservadas. Las transiciones no válidas o el stock insuficiente devuelven un
error de API que el panel muestra en pantalla.

El detalle de un pedido incluye cliente, fecha, estado, total y líneas con
producto, cantidad, precio unitario y subtotal.

## Funcionalidades de tienda conectadas

- Catálogo con búsqueda, filtros por categoría, marca y rango de precio.
- Carrito persistente por cuenta: agregar, cambiar cantidad y quitar productos.
- Finalización de compra desde el carrito; los pedidos se crean inicialmente
  como `Pendiente`.
- Consulta y cancelación de pedidos pendientes del cliente.
- Consulta de notificaciones asociadas a sus pedidos.

## Errores habituales

- **La API no inicia:** comprueba `http://127.0.0.1:8000/api/health`.
- **Error CORS:** abre el frontend por un origen incluido en
  `KERMEL_ALLOWED_ORIGINS` y reinicia FastAPI después de cambiarlo.
- **El login acepta credenciales pero `/auth/me` responde `401`:** revisa que
  frontend y API usen el mismo host, que la página se abra por HTTP y que
  `KERMEL_COOKIE_SECURE=false` en desarrollo HTTP.
- **No se pueden guardar productos o categorías:** confirma que la sesión tenga
  rol `admin`, que la categoría exista y que los valores numéricos sean válidos.
- **No se puede reducir el stock:** comprueba las reservas pendientes antes de
  editar el stock total.

La base de datos persistente se encuentra en `backend/data/kermel.db`. No la
borres si necesitas conservar cuentas, productos, sesiones o pedidos.
