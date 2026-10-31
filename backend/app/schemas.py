from typing import Literal

from pydantic import BaseModel, Field


OrderStatus = Literal[
    "Pendiente",
    "Confirmado",
    "Enviado",
    "Entregado",
    "Cancelado",
]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    brand: str = Field(min_length=1, max_length=80)
    category_id: int = Field(gt=0)
    price: int = Field(ge=0)
    stock: int = Field(ge=0)
    socket: str | None = Field(default=None, max_length=40)
    icon: str = Field(default="📦", max_length=20)
    specs: list[str] = Field(default_factory=list)
    image: str | None = None


class ProductUpdate(ProductCreate):
    pass


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=300)


class CategoryUpdate(CategoryCreate):
    pass


class CartItemAdd(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1000)


class CartItemChange(BaseModel):
    quantity: int = Field(gt=0, le=1000)


class OrderStatusChange(BaseModel):
    estado: OrderStatus

