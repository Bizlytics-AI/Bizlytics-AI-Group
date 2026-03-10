from app.database import SessionLocal
from app.auth.models import User, OTPVerification, HRAccount
import json

db = SessionLocal()
users = db.query(User).all()
otps = db.query(OTPVerification).all()
hr_accounts = db.query(HRAccount).all()

print("--- USERS ---")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

print("\n--- OTPS ---")
for o in otps:
    print(f"ID: {o.id}, Email: {o.email}, Code: {o.otp_code}, Verified: {o.verified}, Created: {o.created_at}")

print("\n--- HR ACCOUNTS ---")
for h in hr_accounts:
    print(f"ID: {h.id}, Email: {h.email}, Verified: {h.otp_verified}")
