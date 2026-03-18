import io #binary file → readable buffer
import logging

import pandas as pd
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics.duckdb_manager import load_dataframe
from app.analytics.models import FileType, RawUpload, UploadStatus

logger = logging.getLogger(__name__)


def _parse_to_dataframe(content: bytes, file_type: FileType) -> pd.DataFrame:
    """
    B1: Parse raw binary content into a pandas DataFrame.
    """
    buf = io.BytesIO(content)

    if file_type == FileType.csv:
        return pd.read_csv(buf, encoding="utf-8", on_bad_lines="skip")
    elif file_type == FileType.xlsx:
        return pd.read_excel(buf, engine="openpyxl")
    elif file_type == FileType.json:
        return pd.read_json(buf)

    raise ValueError(f"Unsupported file type: {file_type}")


# def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
#     """
#     B2-B4: Apply cleaning logic: normalization, null handling, and deduplication.
#     """
#     # B2: Column normalisation
#     df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_", regex=False)

#     # B3: Null handling
#     df = df.dropna(how="all")  # Rows
#     df = df.dropna(axis=1, how="all")  # Columns

#     # B4: Deduplication
#     df = df.drop_duplicates().reset_index(drop=True)

#     # Whitespace stripping from string values
#     df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

#     return df

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:

    # Normalize columns
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
    )

    # Strip whitespace first
    df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    # Convert empty strings to NaN
    df.replace("", pd.NA, inplace=True)

    # Remove empty rows
    df = df.dropna(how="all")

    # Remove empty columns
    df = df.dropna(axis=1, how="all")

    # Remove duplicates
    df = df.drop_duplicates().reset_index(drop=True)

    return df

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


async def save_raw_file(db: Session, file: UploadFile, company_id: int) -> RawUpload:
    """Save the raw file content to PostgreSQL and stop (ETL deferred)."""
    try:
        content = await file.read()
        file_type = detect_file_type(file.filename)

        raw_upload = RawUpload(
            company_id=company_id,
            filename=file.filename,
            file_type=file_type,
            content=content,
            status=UploadStatus.pending,  # B1: Marked as pending till ETL runs
        )

        db.add(raw_upload)
        db.commit()
        # db.refresh(raw_upload)  # No longer needed with expire_on_commit=False

        logger.info(
            f"File {file.filename} saved to PostgreSQL for company {company_id}"
        )
        return raw_upload
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving file to Postgres: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
