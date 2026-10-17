from typing import Literal

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class OrderRequest(BaseModel):
    cliente: str = Field(min_length=1, max_length=120)
    producto: str = Field(min_length=1, max_length=120)
    categoria: str = Field(min_length=1, max_length=80)
    total: int = Field(gt=0, le=2_147_483_647)
    estado: Literal["Pagado", "Pendiente", "Cancelado"] = "Pagado"
