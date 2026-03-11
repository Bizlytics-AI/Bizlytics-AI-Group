from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, LargeBinary
from datetime import datetime
import enum
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

class RawUpload(Base):
    __tablename__ = "raw_uploads"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    content = Column(LargeBinary, nullable=False) # Stores the raw file BLOB
    status = Column(Enum(UploadStatus), default=UploadStatus.pending)
    row_count = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
