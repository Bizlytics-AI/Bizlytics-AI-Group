from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import admin_service
from app.auth.dependencies import get_current_user
from app.auth.models import User, UserRole
from app.auth.schemas import MessageResponse
from app.database import get_db

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to enforce admin role."""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Requires admin privileges"
        )
    return current_user


@router.get("/companies/pending")
def list_pending_companies(
    db: Session = Depends(get_db), current_admin: User = Depends(require_admin)
):
    """List all companies awaiting approval."""
    return admin_service.get_pending_companies(db)


@router.post("/companies/{company_id}/approve", response_model=MessageResponse)
def approve_pending_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Approve a company registration."""
    return admin_service.approve_company(db, company_id)


@router.post("/companies/{company_id}/reject", response_model=MessageResponse)
def reject_pending_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Reject a company registration."""
    return admin_service.reject_company(db, company_id)
