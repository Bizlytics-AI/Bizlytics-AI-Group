from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.schemas import (
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
# DEVELOPER B — Company Registration
# ============================================

from app.auth.schemas import CompanyRegisterRequest

@router.post("/company/register", response_model=MessageResponse, status_code=201)
def company_register(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
    """Register a new company and create a new tenant schema."""
    return service.register_company(db, data)


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