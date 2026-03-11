from app.auth.models import HRAccount, RefreshToken, User
from app.database import SessionLocal

db = SessionLocal()

# Clear HR related data
db.query(RefreshToken).delete()
db.query(HRAccount).delete()
db.query(User).filter(User.role == "hr").delete()

db.commit()
print("Database cleaned: All HR accounts, refresh tokens, and HR users removed.")
