# ETL Analytics Setup — Developer A

## 1. Goal of A1–A5 in the Project
The goal to build the analytics data infrastructure for the system.

In this project we use two databases:

| Database | Purpose |
| :--- | :--- |
| **PostgreSQL** | Operational data (users, companies, raw uploaded files) |
| **DuckDB** | Analytical data (cleaned business datasets for AI queries) |

So the pipeline works like this:
1. HR uploads file
2. PostgreSQL stores raw file (BLOB)
3. ETL processing
4. Cleaned data stored in DuckDB
5. AI chatbot runs SQL analytics queries

Developer A’s job is to prepare the storage and loading layer so cleaned datasets can be stored efficiently.
Developer B will focus on data parsing and cleaning logic.

## 2. What Specifically Build
Developer A builds three important capabilities:
- DuckDB database connection
- Mechanism to store company datasets in DuckDB
- System to store uploaded files safely in PostgreSQL

This enables the ETL pipeline to move data like this:
**PostgreSQL → Pandas → DuckDB**

## 3. A1 — Create DuckDB Manager
### Purpose
DuckDB is used as the analytics database. It runs locally as a single .db file and does not require a server like PostgreSQL. We created a central connection manager so all analytics code uses the same database connection.

### File Created
`app/analytics/duckdb_manager.py`

### Implementation
```python
import duckdb
from pathlib import Path

DB_PATH = "data/bizlytics.db"

_conn = None

def get_connection():
    global _conn

    if _conn is None:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = duckdb.connect(DB_PATH)

    return _conn
```
### What this does
- Creates the analytics database file: `data/bizlytics.db`
- Ensures only one DuckDB connection is used
- Works similar to SQLite

## 4. A2 — Company-Based Data Isolation
### Purpose
Each company uploads their own datasets. We must ensure companies cannot access each other's data. To achieve this, we create separate DuckDB tables per company.

Example:
- `company_1_data`
- `company_2_data`
- `company_3_data`

Each company’s cleaned dataset is stored in its own table.

## 5. A3 — Load Cleaned Data into DuckDB
### Purpose
After Developer B cleans the data using Pandas, we must store it in DuckDB. We implemented a function to load a Pandas dataframe directly into DuckDB.

### Implementation
Inside `app/analytics/duckdb_manager.py`:
```python
def load_dataframe(company_id: int, df):
    con = get_connection()
    table = f"company_{company_id}_data"

    con.execute(
        f"CREATE TABLE IF NOT EXISTS {table} AS SELECT * FROM df LIMIT 0"
    )

    con.execute(
        f"INSERT INTO {table} SELECT * FROM df"
    )
```
### What this function does
- Gets DuckDB connection
- Creates company table if it doesn't exist
- Inserts dataframe rows into that table

Example result (`company_1_data`):
| name | revenue |
| :--- | :--- |
| A | 1000 |
| B | 2000 |

## 6. A4 — Store Raw Uploads in PostgreSQL
### Purpose
Before cleaning the data, we store the original uploaded file in PostgreSQL. This allows:
- Data recovery
- Debugging ETL failures
- Reprocessing files later

We store files as binary data (BLOB).

### Database Model
File: `app/analytics/models.py`
```python
class RawUpload(Base):
    __tablename__ = "raw_uploads"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(
        Integer,
        ForeignKey("public.companies.id", ondelete="CASCADE"),
        nullable=False
    )
    filename = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    content = Column(LargeBinary, nullable=False)
    status = Column(Enum(UploadStatus), default=UploadStatus.pending)
    row_count = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```
### Stored Data Example
| id | filename | status |
| :--- | :--- | :--- |
| 1 | sales.csv | pending |

## 7. A4 — File Upload Service
We created a function that saves uploaded files.

File: `app/analytics/service.py`
```python
async def save_raw_upload(db: Session, company_id: int, file: UploadFile) -> RawUpload:
    content = await file.read()
    file_type = detect_file_type(file.filename)

    raw_upload = RawUpload(
        company_id=company_id,
        filename=file.filename,
        file_type=file_type,
        content=content,
        status=UploadStatus.pending,
    )

    db.add(raw_upload)
    db.commit()
    db.refresh(raw_upload)

    return raw_upload
```
This stores the uploaded file in PostgreSQL.

## 8. A5 — DuckDB Smoke Test
To verify that DuckDB works correctly, we ran a simple query.
```python
from app.analytics.duckdb_manager import get_connection

con = get_connection()
con.execute("SELECT 42").fetchall()
```
Result: `[(42,)]`

This confirmed:
- DuckDB database created
- Connection works
- SQL queries execute correctly

## 9. System Architecture After A1–A5
After completing A1–A5 the system works like this:
1. HR uploads file
2. FastAPI upload endpoint
3. File stored in PostgreSQL (raw_uploads)
4. Raw data available for ETL
5. DuckDB ready to store cleaned data

However, ETL processing is not yet triggered. That will happen during A6–A10 integration.
