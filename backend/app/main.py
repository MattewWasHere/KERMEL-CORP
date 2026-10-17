from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import database
from app.config import ALLOWED_ORIGINS, FRONTEND_DIRECTORY
from app.routers import auth, orders
from app.security import get_current_user


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize_database()
    yield


app = FastAPI(title="KERMEL CORP API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router)
app.include_router(orders.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/Dashboard.html", include_in_schema=False)
def dashboard(
    user: Annotated[dict[str, object], Depends(get_current_user)],
) -> FileResponse:
    return FileResponse(FRONTEND_DIRECTORY / "Dashboard.html")


app.mount("/", StaticFiles(directory=FRONTEND_DIRECTORY, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
