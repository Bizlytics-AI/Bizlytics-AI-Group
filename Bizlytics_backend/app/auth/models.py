from sqlalchemy import Column, Integer, String, DateTime, Enum
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


# ----------------------------
# GLOBAL USERS TABLE
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


# ----------------------------
# OTP VERIFICATION TABLE
# ----------------------------

class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, index=True)

    otp_code = Column(String)

    expires_at = Column(DateTime)

    verified = Column(String, default="false")

    created_at = Column(DateTime, default=datetime.utcnow)