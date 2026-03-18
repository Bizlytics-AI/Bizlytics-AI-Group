import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics import service
from app.auth.dependencies import require_hr
from app.auth.models import User, Company
from app.auth.tenant_models import HRAccount
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    Upload a file and save it to PostgreSQL.
    """
    # Find the numeric company_id from the public.companies table
    company = (
        db.query(Company).filter(Company.schema_name == current_user.schema_name).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company metadata not found")
    
    company_id = company.id

    # Save the file to Postgres (A4)
    raw_upload = await service.save_raw_file(db, file, company_id)

    return {
        "message": f"File '{file.filename}' uploaded and saved to database.",
        "upload_id": raw_upload.id,
        "status": raw_upload.status,
    }


@router.get("/files")
def list_company_files(
    db: Session = Depends(get_db), current_user: User = Depends(require_hr)
):
    """
    List all uploaded files for the HR's company.
    """
    # Find the numeric company_id from the public.companies table
    company = (
        db.query(Company).filter(Company.schema_name == current_user.schema_name).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company metadata not found")

    company_id = company.id

    from app.analytics.models import RawUpload

    files = (
        db.query(RawUpload)
        .filter(RawUpload.company_id == company_id)
        .order_by(RawUpload.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "status": f.status,
            "created_at": f.created_at,
        }
        for f in files
    ]
