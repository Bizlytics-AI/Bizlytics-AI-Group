# Bizlytics Authentication Module — Complete Implementation

> **Architecture:** Multi-tenant · Single Database · Multiple Schemas (one schema per company)
>
> **Public schema** → `users`, `companies`, `otp_verifications`, `refresh_tokens`
> **Per-company schema** → `hr_accounts` (tenant-isolated)


---

# PART 1 — SHARED (Both Developers)

> These files are shared. Implement them first before Developer A or B code.

---

## 1.1 Terminal Commands

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
source venv/bin/activate
pip install "passlib[bcrypt]==1.7.4" "python-jose[cryptography]==3.4.0" "python-multipart==0.0.20" "bcrypt==4.0.1"
```

Add to bottom of `requirements.txt`:

```
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.4.0
python-multipart==0.0.20
bcrypt==4.0.1
```

Create `__init__.py` files (if not already done):

```bash
touch app/__init__.py app/auth/__init__.py app/core/__init__.py
```

---

## 1.2 .env — Add these lines below DATABASE_URL

```env
JWT_SECRET_KEY=bzltx-8f3a9c7d2e1b4a6f5083d7c2e9b4a1f6d3c8e5b2a7f4019d6c3e8b5a2f7d4
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
OTP_EXPIRE_MINUTES=10
```

---

## 1.3 SHARED — `app/core/config.py`

> Already created by you ✅

```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/bizlytics")

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
```

---

## 1.4 SHARED — `app/auth/models.py`

> **Replace your entire current models.py.**
>
> Changes from current version:
> - Added `Boolean`, `ForeignKey` imports
> - Added `relationship` import
> - HRAccount now in public schema with `company_id` ForeignKey
> - `OTPVerification.verified` → `Boolean` (was `String`)
> - New `RefreshToken` model
>
> **Multi-tenant note:** `schema_name` on Company and User links to the per-company PostgreSQL schema.
> HRAccount is in public schema but linked to Company via FK. The per-company schema
> will hold tenant-specific business data (departments, employees, etc.) — not auth data.

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import enum


# ----------------------------
# ENUMS
# ----------------------------

class CompanyStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class UserRole(str, enum.Enum):
    admin = "admin"
    company = "company"
    hr = "hr"


# ----------------------------
# COMPANY TABLE (PUBLIC SCHEMA)
# ----------------------------

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    company_email = Column(String, unique=True, index=True, nullable=False)
    schema_name = Column(String, unique=True, nullable=False)
    status = Column(Enum(CompanyStatus), default=CompanyStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    hr_accounts = relationship("HRAccount", back_populates="company")


# ----------------------------
# GLOBAL USERS TABLE (PUBLIC SCHEMA)
# ----------------------------

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole))
    schema_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    refresh_tokens = relationship("RefreshToken", back_populates="user")


# ----------------------------
# HR ACCOUNTS (PUBLIC SCHEMA — linked to company via FK)
# ----------------------------

class HRAccount(Base):
    __tablename__ = "hr_accounts"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    otp_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="hr_accounts")


# ----------------------------
# OTP VERIFICATION (PUBLIC SCHEMA)
# ----------------------------

class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp_code = Column(String)
    expires_at = Column(DateTime)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ----------------------------
# REFRESH TOKENS (PUBLIC SCHEMA) — NEW TABLE
# ----------------------------

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")
```

After updating, drop & recreate tables:

```bash
python -c "
from app.database import engine, Base
from app.auth.models import *
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print('Tables recreated!')
"
```

Verify:

```bash
psql -U postgres -d bizlytics -c '\dt public.*'
```

Expected: `companies`, `users`, `hr_accounts`, `otp_verifications`, `refresh_tokens`

---

## 1.5 SHARED — `app/auth/tenant_models.py`

> HRAccount moved to `models.py`. Keep this as placeholder for future tenant tables.

```python
from sqlalchemy.orm import declarative_base

TenantBase = declarative_base()

# Future tenant-specific models (per-company schema) go here
# Example:
# class Department(TenantBase):
#     __tablename__ = "departments"
#     id = Column(Integer, primary_key=True)
#     name = Column(String(255))
```

---

## 1.6 SHARED — `app/auth/schemas.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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


# --- OTP Verification (Developer A) ---

class OTPVerifyRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)


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
```

---

## 1.7 SHARED — `app/auth/repository.py`

```python
import hashlib
from datetime import datetime

from sqlalchemy.orm import Session

from app.auth.models import (
    Company,
    CompanyStatus,
    User,
    UserRole,
    HRAccount,
    OTPVerification,
    RefreshToken,
)


# ============================================
# Company Operations (Used by Developer B)
# ============================================

def get_company_by_email(db: Session, email: str) -> Company | None:
    return db.query(Company).filter(Company.company_email == email).first()


def create_company(db: Session, company_name: str, company_email: str, schema_name: str) -> Company:
    company = Company(
        company_name=company_name,
        company_email=company_email,
        schema_name=schema_name,
        status=CompanyStatus.pending,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


# ============================================
# User Operations (Used by Developer A)
# ============================================

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password_hash: str, role: UserRole, schema_name: str | None = None) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
        role=role,
        schema_name=schema_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ============================================
# HR Account Operations (Used by Developer A)
# ============================================

def create_hr_account(db: Session, company_id: int, email: str, password_hash: str) -> HRAccount:
    hr = HRAccount(
        company_id=company_id,
        email=email,
        password_hash=password_hash,
        otp_verified=False,
    )
    db.add(hr)
    db.commit()
    db.refresh(hr)
    return hr


def activate_hr_account(db: Session, email: str) -> None:
    hr = db.query(HRAccount).filter(HRAccount.email == email).first()
    if hr:
        hr.otp_verified = True
        db.commit()


# ============================================
# OTP Operations (Used by Developer A)
# ============================================

def save_otp(db: Session, email: str, otp_code: str, expires_at: datetime) -> OTPVerification:
    otp_record = OTPVerification(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at,
        verified=False,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)
    return otp_record


def get_latest_otp(db: Session, email: str) -> OTPVerification | None:
    return (
        db.query(OTPVerification)
        .filter(OTPVerification.email == email)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )


def mark_otp_verified(db: Session, otp_record: OTPVerification) -> None:
    otp_record.verified = True
    db.commit()


# ============================================
# Refresh Token Operations (Used by Developer A)
# ============================================

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def save_refresh_token(db: Session, user_id: int, raw_token: str, expires_at: datetime) -> RefreshToken:
    token_record = RefreshToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(token_record)
    db.commit()
    db.refresh(token_record)
    return token_record


def get_refresh_token(db: Session, raw_token: str) -> RefreshToken | None:
    return db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(raw_token)).first()


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_record = get_refresh_token(db, raw_token)
    if token_record:
        token_record.revoked = True
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False,
    ).update({"revoked": True})
    db.commit()
```

---

## 1.8 SHARED — `app/main.py` (Update)

```python
import logging
from fastapi import FastAPI
from app.database import Base, engine
from app.auth import models
from app.auth.routes import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)

app = FastAPI(
    title="Bizlytics API",
    description="Business Analytics Platform — Multi-tenant",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])


@app.get("/")
def root():
    return {"message": "Bizlytics API Running"}
```

---
---
---

# PART 2 — DEVELOPER A CODE

> **Developer A Responsibilities:**
> - `core/security.py` — Password hashing
> - `core/jwt_handler.py` — JWT tokens
> - `auth/service.py` — `register_hr()`, `verify_otp()`, `login_user()`, `refresh_tokens()`, `logout_user()`
> - `auth/dependencies.py` — `get_current_user()`, `require_admin()`, `require_hr()`, `require_company()`
> - `auth/routes.py` — `/hr/register`, `/hr/verify-otp`, `/login`, `/refresh`, `/logout`, `/me`

---

## 2.1 DEVELOPER A — `app/core/security.py`

```python
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    return _pwd_context.verify(plain_password, hashed_password)
```

---

## 2.2 DEVELOPER A — `app/core/jwt_handler.py`

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, status
import uuid

from app.core.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)


def create_access_token(data: dict) -> str:
    """Create a short-lived JWT access token (30 min)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "token_type": "access", "jti": uuid.uuid4().hex})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a long-lived JWT refresh token (7 days)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "token_type": "refresh", "jti": uuid.uuid4().hex})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises 401 if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("user_id") is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user_id",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

---

## 2.3 DEVELOPER A — `app/auth/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.models import User
from app.core.jwt_handler import decode_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT, return User from DB."""
    payload = decode_token(credentials.credentials)

    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: str):
    """Factory that creates a dependency to enforce role-based access."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


require_admin = require_role("admin")
require_hr = require_role("hr")
require_company = require_role("company")
```

---

## 2.4 DEVELOPER A — `app/auth/service.py` (Developer A functions)

> This file is shared. Developer A writes these functions.
> Developer B will add `register_company()` to the same file later.

```python
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.auth import repository as repo
from app.auth.models import UserRole, HRAccount
from app.auth.schemas import (
    CompanyRegisterRequest,
    HRRegisterRequest,
    OTPVerifyRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    MessageResponse,
)
from app.core.security import hash_password, verify_password
from app.core.jwt_handler import create_access_token, create_refresh_token, decode_token
from app.core.otp_service import generate_otp, send_otp
from app.core.config import OTP_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS


# ============================================
# DEVELOPER A — HR Registration
# ============================================

def register_hr(db: Session, data: HRRegisterRequest) -> MessageResponse:
    """
    Register a new HR under a company.
    Flow: verify company → check uniqueness → hash password → create user + HR → generate & send OTP
    """
    # Verify company exists
    company = repo.get_company_by_email(db, data.company_email)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found with this email",
        )

    # Check if HR email already registered
    existing_user = repo.get_user_by_email(db, data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    # Hash password
    hashed = hash_password(data.password)

    # Create user (role=hr, schema_name=company's schema)
    repo.create_user(
        db=db,
        email=data.email,
        password_hash=hashed,
        role=UserRole.hr,
        schema_name=company.schema_name,
    )

    # Create HR account
    repo.create_hr_account(
        db=db,
        company_id=company.id,
        email=data.email,
        password_hash=hashed,
    )

    # Generate OTP, save, send
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    repo.save_otp(db=db, email=data.email, otp_code=otp_code, expires_at=expires_at)
    send_otp(data.email, otp_code)

    return MessageResponse(message="HR registered successfully. OTP sent to email for verification.")


# ============================================
# DEVELOPER A — OTP Verification
# ============================================

def verify_otp(db: Session, data: OTPVerifyRequest) -> MessageResponse:
    """
    Verify OTP code for HR account activation.
    Flow: get latest OTP → validate → check expiry → mark verified → activate HR
    """
    otp_record = repo.get_latest_otp(db, data.email)
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No OTP found for this email. Please register first.",
        )

    if otp_record.otp_code != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code",
        )

    now = datetime.now(timezone.utc)
    otp_expiry = otp_record.expires_at
    if otp_expiry.tzinfo is None:
        otp_expiry = otp_expiry.replace(tzinfo=timezone.utc)
    if otp_expiry < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    if otp_record.verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has already been used",
        )

    repo.mark_otp_verified(db, otp_record)
    repo.activate_hr_account(db, data.email)

    return MessageResponse(message="OTP verified. HR account is now active.")


# ============================================
# DEVELOPER A — Login
# ============================================

def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    """
    Authenticate user and return access + refresh tokens.
    Flow: find user → verify password → check HR OTP → generate tokens → store refresh token
    """
    user = repo.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # If HR, check OTP verified
    if user.role == UserRole.hr:
        hr_account = db.query(HRAccount).filter(HRAccount.email == user.email).first()
        if hr_account and not hr_account.otp_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR account not verified. Please verify OTP first.",
            )

    # Generate tokens (schema_name for multi-tenant routing)
    token_data = {
        "user_id": user.id,
        "role": user.role.value,
        "schema_name": user.schema_name,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    repo.save_refresh_token(db=db, user_id=user.id, raw_token=refresh_token, expires_at=refresh_expires)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ============================================
# DEVELOPER A — Refresh Tokens
# ============================================

def refresh_tokens(db: Session, data: RefreshTokenRequest) -> TokenResponse:
    """
    Issue new token pair using a valid refresh token.
    Flow: decode → lookup → check revoked → revoke old → issue new → store
    """
    payload = decode_token(data.refresh_token)
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected refresh token.",
        )

    token_record = repo.get_refresh_token(db, data.refresh_token)
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    if token_record.revoked:
        repo.revoke_all_user_tokens(db, token_record.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. All sessions terminated.",
        )

    repo.revoke_refresh_token(db, data.refresh_token)

    token_data = {
        "user_id": payload["user_id"],
        "role": payload["role"],
        "schema_name": payload.get("schema_name"),
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    refresh_expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    repo.save_refresh_token(db=db, user_id=payload["user_id"], raw_token=new_refresh, expires_at=refresh_expires)

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


# ============================================
# DEVELOPER A — Logout
# ============================================

def logout_user(db: Session, user_id: int) -> MessageResponse:
    """Logout by revoking all refresh tokens for the user."""
    repo.revoke_all_user_tokens(db, user_id)
    return MessageResponse(message="Logged out successfully")


# ============================================
# DEVELOPER B will add here:
#
# import re
#
# def register_company(db: Session, data: CompanyRegisterRequest) -> MessageResponse:
#     ...
#     schema_name = "company_" + re.sub(r"[^a-z0-9]+", "_", data.company_name.lower()).strip("_")
#     ...
#
# ============================================
```

---

## 2.5 DEVELOPER A — `app/auth/routes.py` (Developer A routes)

> This file is shared. Developer A writes these routes.
> Developer B will add `POST /company/register` later.

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.schemas import (
    CompanyRegisterRequest,
    HRRegisterRequest,
    OTPVerifyRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    MessageResponse,
    UserResponse,
)
from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.models import User

router = APIRouter()


# ============================================
# DEVELOPER A — HR Registration & OTP
# ============================================

@router.post("/hr/register", response_model=MessageResponse, status_code=201)
def hr_register(data: HRRegisterRequest, db: Session = Depends(get_db)):
    """Register a new HR under a company. Sends OTP to email."""
    return service.register_hr(db, data)


@router.post("/hr/verify-otp", response_model=MessageResponse)
def hr_verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify HR OTP and activate account."""
    return service.verify_otp(db, data)


# ============================================
# DEVELOPER A — Login, Refresh, Logout, Profile
# ============================================

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access + refresh tokens."""
    return service.login_user(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh tokens using a valid refresh token."""
    return service.refresh_tokens(db, data)


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout — revokes all refresh tokens. Requires JWT."""
    return service.logout_user(db, current_user.id)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile. Requires JWT."""
    return current_user


# ============================================
# DEVELOPER B will add here:
#
# @router.post("/company/register", response_model=MessageResponse, status_code=201)
# def company_register(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
#     return service.register_company(db, data)
#
# ============================================
```

---

## 2.6 DEVELOPER A — Testing Commands

Start server:

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

Since company registration (Developer B) is not done yet, insert a test company manually:

```bash
python -c "
from app.database import SessionLocal
from app.auth.models import Company, CompanyStatus
db = SessionLocal()
company = Company(
    company_name='ABC Pvt Ltd',
    company_email='admin@abc.com',
    schema_name='company_abc_pvt_ltd',
    status=CompanyStatus.pending,
)
db.add(company)
db.commit()
print(f'Company created with id={company.id}')
db.close()
"
```

Then test in order:

```bash
# 1. HR Registration
curl -s -X POST http://localhost:8000/auth/hr/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@abc.com","password":"Test@123456","company_email":"admin@abc.com"}' | python -m json.tool

# 2. OTP Verification (use OTP from server console)
curl -s -X POST http://localhost:8000/auth/hr/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@abc.com","otp":"REPLACE_WITH_OTP"}' | python -m json.tool

# 3. Login
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@abc.com","password":"Test@123456"}' | python -m json.tool

# 4. Get Profile
curl -s http://localhost:8000/auth/me \
  -H "Authorization: Bearer REPLACE_WITH_ACCESS_TOKEN" | python -m json.tool

# 5. Refresh Token
curl -s -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"REPLACE_WITH_REFRESH_TOKEN"}' | python -m json.tool

# 6. Logout
curl -s -X POST http://localhost:8000/auth/logout \
  -H "Authorization: Bearer REPLACE_WITH_ACCESS_TOKEN" | python -m json.tool
```

---
---
---

# PART 3 — DEVELOPER B CODE

> **Developer B Responsibilities:**
> - `core/otp_service.py` — OTP generation & sending
> - `auth/service.py` — Add `register_company()` to the existing file
> - `auth/routes.py` — Add `POST /auth/company/register` to the existing file
> - `core/tenant.py` — Create tenant schema on company registration (multi-tenant)

---

## 3.1 DEVELOPER B — `app/core/otp_service.py`

> Already created by you ✅

```python
import random
import logging

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return f"{random.randint(100000, 999999)}"


def send_otp(email: str, otp_code: str) -> None:
    """
    Send OTP to email. Currently prints to console.
    Replace with real email service in production.
    """
    logger.info(
        "\n═══════════════════════════════════════════════════\n"
        "  📧 OTP for %s : %s\n"
        "═══════════════════════════════════════════════════",
        email,
        otp_code,
    )
```

---

## 3.2 DEVELOPER B — `app/core/tenant.py` (Multi-Tenant Schema Creator)

> Creates a new PostgreSQL schema when a company registers.
> This is the key multi-tenant piece — each company gets its own isolated schema.

```python
from sqlalchemy import text
from sqlalchemy.orm import Session


def create_tenant_schema(db: Session, schema_name: str) -> None:
    """
    Create a new PostgreSQL schema for a company (tenant).

    Each company gets its own schema for data isolation:
      - company_abc_pvt_ltd.hr_accounts
      - company_abc_pvt_ltd.departments (future)
      - company_abc_pvt_ltd.employees (future)

    Args:
        db: Database session.
        schema_name: The schema name (e.g., "company_abc_pvt_ltd").
    """
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    db.commit()
```

---

## 3.3 DEVELOPER B — Add to `app/auth/service.py`

> **Add this function to the existing `service.py` file** (which Developer A already created).
> Add `import re` at the top of the file.
> Add `from app.core.tenant import create_tenant_schema` at the top of the file.

```python
# Add these imports at the TOP of service.py:
# import re
# from app.core.tenant import create_tenant_schema

# ============================================
# DEVELOPER B — Company Registration
# ============================================

def register_company(db: Session, data: CompanyRegisterRequest) -> MessageResponse:
    """
    Register a new company. Creates tenant schema for multi-tenant isolation.
    Flow: check uniqueness → generate schema_name → hash password → create company → create user → create schema
    """
    # Check if company email already exists
    existing = repo.get_company_by_email(db, data.company_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this email already exists",
        )

    existing_user = repo.get_user_by_email(db, data.company_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    # Generate tenant schema name: "ABC Pvt Ltd" → "company_abc_pvt_ltd"
    schema_name = "company_" + re.sub(r"[^a-z0-9]+", "_", data.company_name.lower()).strip("_")

    # Hash password
    hashed = hash_password(data.password)

    # Create company record (status=pending)
    company = repo.create_company(
        db=db,
        company_name=data.company_name,
        company_email=data.company_email,
        schema_name=schema_name,
    )

    # Create user record (role=company)
    repo.create_user(
        db=db,
        email=data.company_email,
        password_hash=hashed,
        role=UserRole.company,
        schema_name=schema_name,
    )

    # Create tenant schema in PostgreSQL (multi-tenant)
    create_tenant_schema(db, schema_name)

    return MessageResponse(
        message=f"Company '{data.company_name}' registered successfully. Status: pending approval."
    )
```

---

## 3.4 DEVELOPER B — Add to `app/auth/routes.py`

> **Add this route to the existing `routes.py` file** (which Developer A already created).

```python
# ============================================
# DEVELOPER B — Company Registration
# ============================================

@router.post("/company/register", response_model=MessageResponse, status_code=201)
def company_register(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
    """Register a new company. Creates tenant schema for multi-tenant isolation."""
    return service.register_company(db, data)
```

---

## 3.5 DEVELOPER B — Testing Commands

After Developer A's code is in place and server is running:

```bash
# 1. Company Registration
curl -s -X POST http://localhost:8000/auth/company/register \
  -H "Content-Type: application/json" \
  -d '{"company_name":"ABC Pvt Ltd","company_email":"admin@abc.com","password":"Test@123456"}' | python -m json.tool

# Verify schema was created
psql -U postgres -d bizlytics -c '\dn'
# Should show: company_abc_pvt_ltd
```

---
---
---

# PART 4 — COMPLETE FILE MAP

```
app/
├── __init__.py                    ← Shared (empty)
├── database.py                    ← Shared (no changes)
├── main.py                       ← Shared (add auth router)
│
├── auth/
│   ├── __init__.py                ← Shared (empty)
│   ├── models.py                  ← Shared (update: add RefreshToken, HRAccount, fix verified)
│   ├── tenant_models.py           ← Shared (placeholder)
│   ├── schemas.py                 ← Shared (all schemas)
│   ├── repository.py              ← Shared (all DB functions)
│   ├── service.py                 ← Dev A writes 5 functions + Dev B adds 1 function
│   ├── dependencies.py            ← Dev A (auth guards)
│   └── routes.py                  ← Dev A writes 6 routes + Dev B adds 1 route
│
├── core/
│   ├── __init__.py                ← Shared (empty)
│   ├── config.py                  ← Shared (env vars)
│   ├── security.py                ← Dev A (bcrypt)
│   ├── jwt_handler.py             ← Dev A (JWT)
│   ├── otp_service.py             ← Dev B (OTP)
│   └── tenant.py                  ← Dev B (schema creation)
```

---

# PART 5 — IMPLEMENTATION ORDER

| Step | Who | What |
|------|-----|------|
| 1 | Shared | Install deps, create `__init__.py`, update `.env`, create `config.py` |
| 2 | Shared | Update `models.py` (add RefreshToken, HRAccount, fix verified) |
| 3 | Shared | Create `schemas.py`, `repository.py` |
| 4 | Dev A | Create `security.py`, `jwt_handler.py` |
| 5 | Dev B | Create `otp_service.py`, `tenant.py` |
| 6 | Dev A | Create `service.py` (login, HR reg, OTP verify, refresh, logout) |
| 7 | Dev A | Create `dependencies.py` (guards) |
| 8 | Dev A | Create `routes.py` (6 routes) |
| 9 | Dev B | Add `register_company()` to `service.py` |
| 10 | Dev B | Add company register route to `routes.py` |
| 11 | Shared | Update `main.py`, start server, test all endpoints |

---

# PART 6 — API ENDPOINTS SUMMARY

| Endpoint | Method | Auth | Developer | Description |
|----------|--------|------|-----------|-------------|
| `/auth/company/register` | POST | Public | B | Register company + create tenant schema |
| `/auth/hr/register` | POST | Public | A | Register HR + send OTP |
| `/auth/hr/verify-otp` | POST | Public | A | Verify OTP + activate HR |
| `/auth/login` | POST | Public | A | Login → access + refresh tokens |
| `/auth/refresh` | POST | Public | A | Refresh token rotation |
| `/auth/logout` | POST | JWT | A | Revoke all refresh tokens |
| `/auth/me` | GET | JWT | A | Get current user profile |
