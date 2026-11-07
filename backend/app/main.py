from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ALLOWED_ORIGINS
from app.database import initialize_database
from app.products_store import initialize_products
from app.routers.auth import router as auth_router
from app.routers.cart import router as cart_router
from app.routers.categories import router as categories_router
from app.routers.dashboard import router as dashboard_router
from app.routers.orders import router as orders_router
from app.routers.products import router as products_router


class AppLifespan:
    async def __aenter__(self):
        initialize_database()
        initialize_products()
        return None

    async def __aexit__(self, error_type, error, traceback):
        return False


def lifespan(_: FastAPI) -> AppLifespan:
    return AppLifespan()


app = FastAPI(
    title="KERMEL CORP API",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent / "static"),
    name="static",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


def custom_docs() -> HTMLResponse:
    docs_page = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="KERMEL CORP | Documentación API",
        swagger_ui_parameters={
            "docExpansion": "list",
            "filter": True,
            "displayRequestDuration": True,
        },
    )
    html = docs_page.body.decode("utf-8").replace(
        "</head>",
        '<link rel="stylesheet" href="/static/docs-theme.css">\n</head>',
    )
    return HTMLResponse(content=html)


def api_info() -> dict[str, str]:
    return {
        "name": "KERMEL CORP API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
    }


def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.add_api_route(
    "/docs",
    custom_docs,
    methods=["GET"],
    include_in_schema=False,
    response_class=HTMLResponse,
)
app.add_api_route("/", api_info, methods=["GET"])
app.add_api_route("/api/health", health_check, methods=["GET"])

app.include_router(auth_router)
app.include_router(cart_router)
app.include_router(categories_router)
app.include_router(dashboard_router)
app.include_router(orders_router)
app.include_router(products_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
    
    
    