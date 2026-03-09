import logging
from fastapi import FastAPI
from app.database import Base, engine
from app.auth import models
from app.auth.routes import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)

app = FastAPI(
    title="Bizlytics API",
    description="Business Analytics Platform — Multi-tenant",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])


@app.get("/")
def root():
    return {"message": "Bizlytics API Running"}