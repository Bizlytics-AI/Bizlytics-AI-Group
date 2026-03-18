# from fastapi import Request

# async def tenant_middleware(request: Request, call_next):
#     tenant = request.headers.get("X-Tenant-ID")

#     if not tenant:
#         tenant = "default"   # or raise error later

#     request.state.tenant = tenant

#     response = await call_next(request)
#     return response
from fastapi import Request
from app.database import SessionLocal, set_tenant_schema

async def tenant_middleware(request: Request, call_next):
    # 1. Extract tenant from header
    tenant = request.headers.get("X-Tenant-ID", "public")
    request.state.tenant = tenant

    # 2. Create the session and set the search_path immediately
    db = SessionLocal()
    set_tenant_schema(db, tenant)
    
    # 3. Store the session in request state for get_db to pick up
    request.state.db = db
    
    try:
        response = await call_next(request)
        return response
    finally:
        # 4. Ensure the session is closed after the request completes
        db.close()