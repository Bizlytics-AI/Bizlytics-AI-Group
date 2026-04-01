import enum
from datetime import datetime

from sqlalchemy import (Column, DateTime, Enum, ForeignKey, Integer,
                        LargeBinary, String)

from app.database import Base


class FileType(str, enum.Enum):
    csv = "csv"
    xlsx = "xlsx"
    json = "json"


class UploadStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


from app.tenant.models import TenantBase

class RawUpload(TenantBase):
    __tablename__ = "raw_uploads"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False) # Removed explicit FK to public.companies to avoid metadata split issues
    filename = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    s3_url = Column(String, nullable=True)  # Stores the S3 URL of the uploaded file
    status = Column(Enum(UploadStatus), default=UploadStatus.pending)
    row_count = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
