from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

# --- Company Registration (Developer B) ---


class CompanyRegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    company_email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


# --- HR Registration (Developer A) ---


class HRRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    company_email: str = Field(..., min_length=5, max_length=255)


# --- Login (Developer A) ---


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


# --- Refresh Token (Developer A) ---


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# --- Responses (Shared) ---


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    schema_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
