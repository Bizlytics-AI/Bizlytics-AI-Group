# from sqlalchemy import text
# from sqlalchemy.orm import Session


# def create_tenant_schema(db: Session, schema_name: str) -> None:
#     """
#     Create a new PostgreSQL schema for a company (tenant).

#     Each company gets its own schema for data isolation:
#       - company_abc_pvt_ltd.hr_accounts
#       - company_abc_pvt_ltd.departments (future)
#       - company_abc_pvt_ltd.employees (future)

#     Args:
#         db: Database session.
#         schema_name: The schema name (e.g., "company_abc_pvt_ltd").
#     """
#     db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
#     db.commit()
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.tenant.models import TenantBase
from app.auth.tenant_models import HRAccount  # Ensure model is registered
from app.analytics.models import RawUpload # Ensure model is registered


def create_tenant_schema(db: Session, schema_name: str):
    # 1. Create schema
    db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
    db.commit()

    # 2. Safely create ALL tenant tables inside schema
    from app.database import engine
    with engine.connect() as connection:
        connection.execute(text(f"SET search_path TO {schema_name}"))
        TenantBase.metadata.create_all(bind=connection)
        connection.commit()