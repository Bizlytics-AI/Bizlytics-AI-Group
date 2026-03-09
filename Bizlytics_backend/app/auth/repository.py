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
