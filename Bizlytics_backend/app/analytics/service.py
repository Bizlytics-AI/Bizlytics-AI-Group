import logging
import pandas as pd
import io

from app.analytics.duckdb_manager import load_dataframe
from app.analytics.models import UploadStatus,RawUpload
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics.models import FileType, RawUpload, UploadStatus

logger = logging.getLogger(__name__)


def detect_file_type(filename: str) -> FileType:
    """Detect file type based on extension."""
    ext = filename.split(".")[-1].lower()
    if ext == "csv":
        return FileType.csv
    elif ext in ["xlsx", "xls"]:
        return FileType.xlsx
    elif ext == "json":
        return FileType.json
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")


async def save_raw_upload(db: Session, company_id: int, file: UploadFile) -> RawUpload:
    """Save the raw file content to PostgreSQL and stop (ETL deferred)."""
    try:
        content = await file.read()
        file_type = detect_file_type(file.filename)

        raw_upload = RawUpload(
            company_id=company_id,
            filename=file.filename,
            file_type=file_type,
            content=content,
            status=UploadStatus.completed,  # Marking as completed since we aren't doing background ETL for now
        )

        db.add(raw_upload)
        db.commit()
        db.refresh(raw_upload)

        logger.info(
            f"File {file.filename} saved to PostgreSQL for company {company_id}"
        )
        return raw_upload
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving file to Postgres: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

