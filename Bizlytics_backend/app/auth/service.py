import re
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
from app.core.tenant import create_tenant_schema


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