from sqlalchemy import text
from sqlalchemy.orm import Session


def create_tenant_schema(db: Session, schema_name: str) -> None:
    """
    Create a new PostgreSQL schema for a company (tenant).

    Each company gets its own schema for data isolation:
      - company_abc_pvt_ltd.hr_accounts
      - company_abc_pvt_ltd.departments (future)
      - company_abc_pvt_ltd.employees (future)

    Args:
        db: Database session.
        schema_name: The schema name (e.g., "company_abc_pvt_ltd").
    """
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    db.commit()
