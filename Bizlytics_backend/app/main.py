import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.auth import models as auth_models
from app.analytics import models as analytics_models

# Initialize FastAPI App
app = FastAPI(
    title="Bizlytics API",
    description="Business Analytics Platform — Multi-tenant",
    version="1.0.0",
)

# Debug Logging Middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"\n[REQUEST] {request.method} {request.url}", flush=True)
    try:
        response = await call_next(request)
        print(f"[RESPONSE] {response.status_code}\n", flush=True)
        return response
    except Exception as e:
        import traceback
        print(f"\n[CRITICAL ERROR] Middleware caught exception:", flush=True)
        traceback.print_exc()
        print("\n", flush=True)
        raise e

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)

# Initialize Database
Base.metadata.create_all(bind=engine)

# Include Routers (Delay imports to avoid circular dependency issues)
from app.auth.routes import router as auth_router
from app.auth.admin_routes import router as admin_router
from app.analytics.routes import router as analytics_router

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])

@app.get("/")
def root():
    return {"message": "Bizlytics API Running"}