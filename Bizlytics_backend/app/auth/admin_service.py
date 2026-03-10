import logging
from typing import List

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.auth.models import Company, CompanyStatus
from app.auth.schemas import MessageResponse

logger = logging.getLogger(__name__)

def get_pending_companies(db: Session) -> List[dict]:
    companies = db.query(Company).filter(Company.status == CompanyStatus.pending).all()
    return [
        {
            "id": c.id,
            "company_name": c.company_name,
            "company_email": c.company_email,
            "status": c.status.value,
            "created_at": c.created_at
        }
        for c in companies
    ]

def approve_company(db: Session, company_id: int) -> MessageResponse:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if company.status != CompanyStatus.pending:
        raise HTTPException(status_code=400, detail="Company is not pending")
        
    company.status = CompanyStatus.approved
    db.commit()
    logger.info("Company %s approved by admin", company.company_email)
    
    return MessageResponse(message=f"Company '{company.company_name}' has been approved.")

def reject_company(db: Session, company_id: int) -> MessageResponse:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if company.status != CompanyStatus.pending:
        raise HTTPException(status_code=400, detail="Company is not pending")
        
    company.status = CompanyStatus.rejected
    db.commit()
    logger.info("Company %s rejected by admin", company.company_email)
    
    return MessageResponse(message=f"Company '{company.company_name}' has been rejected.")
