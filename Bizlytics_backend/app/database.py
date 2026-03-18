import os

from dotenv import load_dotenv
from sqlalchemy import create_engine,text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

Base = declarative_base()


from fastapi import Request

def get_db(request: Request):
    """
    Yields the session established by the tenant middleware.
    """
    db = getattr(request.state, "db", None)
    if db is None:
        # Fallback for systems not going through middleware (like scripts)
        db = SessionLocal()
        tenant = request.headers.get("X-Tenant-ID", "public")
        set_tenant_schema(db, tenant)
        try:
            yield db
        finally:
            db.close()
    else:
        yield db
def set_tenant_schema(db, tenant: str):
    if not tenant:
        tenant = "public"

    db.execute(text(f"SET search_path TO {tenant}, public"))

