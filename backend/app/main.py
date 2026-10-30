from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.config import ALLOWED_ORIGINS
from app.database import initialize_database
from app.products_store import initialize_products, load_products
from app.routers.auth import router as auth_router
from app.routers.orders import router as orders_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    initialize_database()
    initialize_products()
    yield


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
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


@app.get("/docs", include_in_schema=False)
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


@app.get("/")
def api_info() -> dict[str, str]:
    return {
        "name": "KERMEL CORP API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/products")
def list_products() -> list[dict]:
    return load_products()


app.include_router(auth_router)
app.include_router(orders_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
