import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session

from app.analytics import service
from app.auth.dependencies import require_hr
from app.auth.models import HRAccount, User
from app.database import get_db
from storage.s3_service import upload_file_to_s3  

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", status_code=202)
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    Upload file → S3 → Save metadata → Trigger ETL
    """

    # Get HR company
    hr_account = (
        db.query(HRAccount).filter(HRAccount.email == current_user.email).first()
    )
    if not hr_account:
        raise HTTPException(status_code=404, detail="HR account not found")

    company_id = hr_account.company_id

    #  Upload to S3
    file_url = upload_file_to_s3(
        file.file,
        file.filename,
        file.content_type
    )

    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload to S3")

    # Save metadata only (NO BLOB)
    raw_upload = service.save_raw_file(
        db=db,
        file_url=file_url,
        filename=file.filename,
        company_id=company_id
    )

    #  Trigger ETL (background)
    if background_tasks:
        background_tasks.add_task(service.process_etl, raw_upload.id, db)

    return {
        "message": f"File '{file.filename}' uploaded successfully",
        "upload_id": raw_upload.id,
        "status": raw_upload.status,
        "file_url": file_url
    }


@router.get("/files")
def list_company_files(
    db: Session = Depends(get_db), current_user: User = Depends(require_hr)
):
    """
    List all uploaded files
    """

    hr_account = (
        db.query(HRAccount).filter(HRAccount.email == current_user.email).first()
    )
    if not hr_account:
        raise HTTPException(status_code=404, detail="HR account not found")

    from app.analytics.models import RawUpload

    files = (
        db.query(RawUpload)
        .filter(RawUpload.company_id == hr_account.company_id)
        .order_by(RawUpload.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "s3_url": f.s3_url,  
            "status": f.status,
            "created_at": f.created_at,
        }
        for f in files
    ]