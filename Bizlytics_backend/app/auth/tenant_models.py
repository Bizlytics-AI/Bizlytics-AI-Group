from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

TenantBase = declarative_base()


class HRAccount(TenantBase):
    __tablename__ = "hr_accounts"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)

    password_hash = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)