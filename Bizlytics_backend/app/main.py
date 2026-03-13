import logging
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Logging Configuration
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="Bizlytics API",
    description="Business Analytics Platform — Multi-tenant",
    version="1.0.0",
)


# Debug Logging Middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info("[REQUEST] %s %s", request.method, request.url)
    try:
        response = await call_next(request)
        logger.info("[RESPONSE] %s", response.status_code)
        return response
    except Exception as e:
        logger.error("[CRITICAL ERROR] Middleware caught exception")
        traceback.print_exc()
        raise e


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
Base.metadata.create_all(bind=engine)

# Router imports (delayed to avoid circular dependencies)
from app.analytics.routes import router as analytics_router  # noqa: E402
from app.auth.admin_routes import router as admin_router  # noqa: E402
from app.auth.routes import router as auth_router  # noqa: E402

# Include Routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])


@app.get("/")
def root():
    return {"message": "Bizlytics API Running"}
