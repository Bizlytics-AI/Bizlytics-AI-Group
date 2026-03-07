from fastapi import FastAPI
from app.database import Base, engine
from app.auth import models

app = FastAPI()


# Create tables automatically
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Bizlytics API Running"}