from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

class UserRegister(BaseModel):
    email: str = Field(..., description="用戶電子信箱")
    password: str = Field(..., min_length=6, description="用戶密碼，最少 6 個字元")
    role: str = Field(..., description="用戶角色：consumer, merchant, driver")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = ["consumer", "merchant", "driver"]
        if v not in allowed:
            raise ValueError("角色必須是 consumer, merchant 或 driver 之一")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("請輸入有效的電子信箱格式")
        return v


class UserLogin(BaseModel):
    email: str = Field(..., description="用戶電子信箱")
    password: str = Field(..., description="用戶密碼")


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Merchant and Product Schemas ---

class MerchantResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MerchantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, description="商店名稱")
    description: Optional[str] = Field(None, description="商店描述")


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, description="餐點名稱")
    description: Optional[str] = Field(None, description="餐點描述")
    price: float = Field(..., description="餐點價格")

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError("餐點價格不可低於 0 元")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, description="餐點名稱")
    description: Optional[str] = Field(None, description="餐點描述")
    price: Optional[float] = Field(None, description="餐點價格")
    is_available: Optional[bool] = Field(None, description="是否上架")

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("餐點價格不可低於 0 元")
        return v


class ProductResponse(BaseModel):
    id: int
    merchant_id: int
    name: str
    description: Optional[str] = None
    price: float
    is_available: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Order Schemas ---

class OrderItemCreate(BaseModel):
    product_id: int = Field(..., description="餐點商品 ID")
    quantity: int = Field(..., gt=0, description="餐點數量，必須大於 0")


class OrderCreate(BaseModel):
    merchant_id: int = Field(..., description="商家 ID")
    items: list[OrderItemCreate] = Field(..., min_length=1, description="餐點項目清單，至少需要一項")


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float
    product: Optional[ProductResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    consumer_id: int
    merchant_id: int
    driver_id: Optional[int] = None
    status: str
    delivery_fee: float
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
    merchant: Optional[MerchantResponse] = None
    consumer: Optional[UserResponse] = None
    driver: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
