from app.database import SessionLocal
from app.auth.models import User, HRAccount
import json

db = SessionLocal()
users = db.query(User).all()
hr_accounts = db.query(HRAccount).all()

print("--- USERS ---")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

print("\n--- HR ACCOUNTS ---")
for h in hr_accounts:
    print(f"ID: {h.id}, Email: {h.email}, Status: {h.status.value if h.status else 'N/A'}")
