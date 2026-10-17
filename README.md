# KERMEL CORP

Aplicación web con frontend en JavaScript y API en FastAPI con SQLite.

## Estructura

```text
backend/
  app/
    routers/ Rutas de autenticación y pedidos
    config.py, schemas.py, security.py, database.py, main.py
  data/      Base SQLite local (se crea al iniciar la API)
  tests/     Pruebas de la API
frontend/
  controller/ Controladores de autenticación y dashboard
  model/      Acceso a la API
  view/       Vistas y estilos
```

## Ejecución

Consulta [backend/README.md](backend/README.md) para instalar dependencias,
iniciar la API y ejecutar las pruebas.

La base de datos `backend/data/kermel.db` se conserva entre ejecuciones. No la
elimines si necesitas mantener las cuentas o los pedidos guardados.
