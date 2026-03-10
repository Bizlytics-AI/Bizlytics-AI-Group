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


class HRStatus(str, enum.Enum):
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
    status = Column(Enum(HRStatus), default=HRStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="hr_accounts")


# ----------------------------
# REFRESH TOKENS (PUBLIC SCHEMA)
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