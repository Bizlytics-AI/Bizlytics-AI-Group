# ETL Sprint — Day 2: Integration & Verification

> **Goal:** Developer A wires the ETL pipeline into FastAPI. Developer B tests the full flow end-to-end.
> By end of day, uploading a CSV from the browser triggers automatic cleaning and loading into DuckDB.

---

## 👨‍💻 Developer A — Wire the Pipeline

### Task A6: Update `service.py` — Add `process_etl()` Orchestrator

**File:** `app/analytics/service.py` — **[REPLACE ENTIRE FILE]**

This is the updated service with the full ETL pipeline. The key changes:
- `save_raw_upload()` now sets `status=pending` instead of `completed`
- New `process_etl()` function orchestrates Extract → Transform → Load
- Uses the modules built on Day 1 (`etl_transforms` + `duckdb_manager`)

```python
"""
Analytics Service — File upload + ETL pipeline.

This module handles:
1. Saving raw file uploads to PostgreSQL (the "Extract" source).
2. Running the ETL pipeline in the background (Extract → Transform → Load).
3. Updating upload status throughout the pipeline.

The ETL pipeline runs ASYNCHRONOUSLY after the HTTP response is sent,
so the user sees "Upload successful" immediately while processing happens
in the background.
"""

import logging

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics.models import FileType, RawUpload, UploadStatus
from app.analytics.etl_transforms import parse_file, clean_dataframe
from app.analytics.duckdb_manager import load_dataframe

logger = logging.getLogger(__name__)


# ─── FILE TYPE DETECTION ───────────────────────────────────────────────

def detect_file_type(filename: str) -> FileType:
    """
    Detect file type from the filename extension.

    Args:
        filename: The original filename (e.g., "employees.csv").

    Returns:
        FileType enum value (csv, xlsx, or json).

    Raises:
        HTTPException 400: If the extension is not supported.
    """
    ext = filename.split(".")[-1].lower()
    if ext == "csv":
        return FileType.csv
    elif ext in ["xlsx", "xls"]:
        return FileType.xlsx
    elif ext == "json":
        return FileType.json
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Allowed: .csv, .xlsx, .json"
        )


# ─── SAVE RAW FILE TO POSTGRESQL ───────────────────────────────────────

async def save_raw_upload(db: Session, company_id: int, file: UploadFile) -> RawUpload:
    """
    Save the raw file bytes to PostgreSQL as a BLOB.

    This is the "Extract" source — the raw, untouched file content.
    Status is set to 'pending' because the ETL pipeline will process it
    in the background after this function returns.

    Args:
        db: SQLAlchemy database session.
        company_id: The company this upload belongs to.
        file: The uploaded file from the HTTP request.

    Returns:
        RawUpload: The newly created database record with upload_id.
    """
    try:
        content = await file.read()
        file_type = detect_file_type(file.filename)

        raw_upload = RawUpload(
            company_id=company_id,
            filename=file.filename,
            file_type=file_type,
            content=content,
            status=UploadStatus.pending,  # ← Changed from 'completed' to 'pending'
        )

        db.add(raw_upload)
        db.commit()
        db.refresh(raw_upload)

        logger.info(
            f"File '{file.filename}' saved to PostgreSQL "
            f"(upload_id={raw_upload.id}, company_id={company_id}, "
            f"size={len(content)} bytes)"
        )
        return raw_upload

    except HTTPException:
        raise  # Re-raise validation errors (like unsupported file type)
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving file to PostgreSQL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


# ─── ETL PIPELINE (RUNS IN BACKGROUND) ────────────────────────────────

def process_etl(upload_id: int, db: Session):
    """
    Run the full ETL pipeline for a single uploaded file.

    This function is called as a BackgroundTask by FastAPI.
    It runs AFTER the HTTP response has been sent to the browser.

    Pipeline steps:
    1. EXTRACT  — Read the raw BLOB from PostgreSQL.
    2. TRANSFORM — Parse bytes into DataFrame, then clean it.
    3. LOAD     — Write cleaned DataFrame into DuckDB.
    4. STATUS   — Update the upload record with results.

    If any step fails, the upload status is set to 'failed'
    and the error message is saved. The server never crashes.

    Args:
        upload_id: The ID of the RawUpload record to process.
        db: SQLAlchemy database session.
    """
    # Step 0: Fetch the upload record from PostgreSQL
    upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()

    if not upload:
        logger.error(f"ETL: Upload {upload_id} not found in database")
        return

    # Mark as "processing" so the frontend shows a spinner
    upload.status = UploadStatus.processing
    db.commit()

    logger.info(
        f"ETL START: upload_id={upload_id}, file='{upload.filename}', "
        f"company_id={upload.company_id}"
    )

    try:
        # ── STEP 1: EXTRACT ──
        # Read the raw bytes that were saved in save_raw_upload()
        raw_content = upload.content  # This is the BLOB from PostgreSQL
        file_type = upload.file_type

        logger.info(f"ETL EXTRACT: Read {len(raw_content)} bytes from PostgreSQL")

        # ── STEP 2: TRANSFORM ──
        # Parse raw bytes → pandas DataFrame
        df_raw = parse_file(raw_content, file_type)
        logger.info(
            f"ETL PARSE: {len(df_raw)} rows, {len(df_raw.columns)} columns"
        )

        # Clean the DataFrame (normalize columns, drop nulls, deduplicate)
        df_clean = clean_dataframe(df_raw)
        logger.info(
            f"ETL CLEAN: {len(df_clean)} rows after cleaning "
            f"({len(df_raw) - len(df_clean)} rows removed)"
        )

        # ── STEP 3: LOAD ──
        # Write cleaned data into DuckDB under company-specific table
        row_count = load_dataframe(upload.company_id, df_clean)

        # ── STEP 4: UPDATE STATUS ──
        upload.status = UploadStatus.completed
        upload.row_count = row_count
        upload.error_message = None

        logger.info(
            f"ETL COMPLETE: upload_id={upload_id}, "
            f"{row_count} rows loaded into DuckDB table "
            f"'company_{upload.company_id}_data'"
        )

    except Exception as e:
        # If ANYTHING fails, mark as failed and save the error
        upload.status = UploadStatus.failed
        upload.error_message = str(e)
        logger.error(f"ETL FAILED: upload_id={upload_id}, error={str(e)}")

    finally:
        # Always commit the status update, whether success or failure
        db.commit()
```

---

### Task A7: Update `routes.py` — Add BackgroundTasks + Status Endpoint

**File:** `app/analytics/routes.py` — **[REPLACE ENTIRE FILE]**

Key changes:
- `/upload` now triggers `process_etl` as a background task and returns `202 Accepted`
- New `GET /status/{upload_id}` endpoint for the frontend to poll processing status
- `/files` now includes `row_count` and `error_message` in the response

```python
"""
Analytics Routes — File upload, status polling, and file listing.

Endpoints:
    POST /analytics/upload      — Upload a file (HR only). Triggers ETL in background.
    GET  /analytics/status/{id} — Poll the processing status of a specific upload.
    GET  /analytics/files       — List all uploaded files for the HR's company.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics import service
from app.analytics.models import RawUpload
from app.auth.dependencies import require_hr
from app.auth.models import HRAccount, User
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", status_code=202)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    Upload a data file and trigger ETL processing in the background.

    Flow:
    1. Save raw file bytes to PostgreSQL (status = 'pending').
    2. Return 202 Accepted immediately — user is NOT made to wait.
    3. BackgroundTasks runs process_etl() AFTER the response is sent.

    The frontend can poll GET /analytics/status/{upload_id} to track progress.

    Request:
        - file: A CSV, XLSX, or JSON file (multipart/form-data).
        - Authorization: Bearer token (HR role required).

    Response (202):
        - upload_id: The ID to use for status polling.
        - status: 'pending' (will change to 'processing' → 'completed'/'failed').
        - filename: The original filename.
    """
    # Get the HR's company ID from their HR account record
    hr_account = (
        db.query(HRAccount).filter(HRAccount.email == current_user.email).first()
    )
    if not hr_account:
        raise HTTPException(status_code=404, detail="HR account not found")

    company_id = hr_account.company_id

    # Step 1: Save raw file to PostgreSQL (status = pending)
    raw_upload = await service.save_raw_upload(db, company_id, file)

    # Step 2: Schedule the ETL pipeline to run in the background
    # This runs AFTER the HTTP response is sent to the browser
    background_tasks.add_task(service.process_etl, raw_upload.id, db)

    logger.info(
        f"Upload accepted: upload_id={raw_upload.id}, "
        f"ETL scheduled as background task"
    )

    # Step 3: Return immediately — user sees "Upload successful"
    return {
        "message": f"File '{file.filename}' uploaded. Processing started.",
        "upload_id": raw_upload.id,
        "status": "pending",
        "filename": file.filename,
    }


@router.get("/status/{upload_id}")
def get_upload_status(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    Poll the processing status of a specific upload.

    The frontend calls this every 3 seconds after uploading a file
    to update the badge from 'Processing...' → 'Completed (N rows)'.

    Response:
        - id: Upload ID.
        - status: 'pending' | 'processing' | 'completed' | 'failed'.
        - row_count: Number of cleaned rows (null if not yet completed).
        - error_message: Error details (null if no error).
    """
    upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()

    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Verify the HR belongs to the same company as the upload
    hr_account = (
        db.query(HRAccount).filter(HRAccount.email == current_user.email).first()
    )
    if not hr_account or hr_account.company_id != upload.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": upload.id,
        "filename": upload.filename,
        "status": upload.status,
        "row_count": upload.row_count,
        "error_message": upload.error_message,
    }


@router.get("/files")
def list_company_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    List all uploaded files for the HR's company.

    Returns files ordered by most recent first.
    Each file includes its processing status, row count, and any error.
    """
    hr_account = (
        db.query(HRAccount).filter(HRAccount.email == current_user.email).first()
    )
    if not hr_account:
        raise HTTPException(status_code=404, detail="HR account not found")

    files = (
        db.query(RawUpload)
        .filter(RawUpload.company_id == hr_account.company_id)
        .order_by(RawUpload.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "status": f.status,
            "row_count": f.row_count,
            "error_message": f.error_message,
            "created_at": f.created_at,
        }
        for f in files
    ]
```

---

### Task A8: Verify `main.py` Already Has the Router

**File:** `app/main.py`

The analytics router is already registered. Just confirm this line exists:

```python
app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
```

✅ No changes needed to `main.py`.

---

## 👩‍💻 Developer B — End-to-End Testing

### Task B6: Test the Full Pipeline via Terminal

After Developer A has updated `service.py` and `routes.py`, restart the server:

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
uvicorn app.main:app --reload
```

Then test using `curl` in another terminal:

**Step 1: Login as HR to get a token**
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hrbridgeon@gmail.com","password":"test@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"
```

**Step 2: Upload a CSV file**
```bash
# Create a test CSV
cat > /tmp/test_upload.csv << 'EOF'
Employee ID, First Name, Last Name, Department, Salary
1, John, Doe, Engineering, 85000
2, Jane, Smith, Marketing, 72000
3, John, Doe, Engineering, 85000
,,,,
4, Bob, Wilson, Sales, 68000
EOF

# Upload it
curl -X POST http://localhost:8000/analytics/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_upload.csv"
```

✅ **Expected response:**
```json
{
  "message": "File 'test_upload.csv' uploaded. Processing started.",
  "upload_id": 1,
  "status": "pending",
  "filename": "test_upload.csv"
}
```

**Step 3: Poll the status**
```bash
# Replace 1 with the actual upload_id from step 2
curl -X GET http://localhost:8000/analytics/status/1 \
  -H "Authorization: Bearer $TOKEN"
```

✅ **Expected response (after processing):**
```json
{
  "id": 1,
  "filename": "test_upload.csv",
  "status": "completed",
  "row_count": 3,
  "error_message": null
}
```

**Step 4: Verify data in DuckDB**
```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
python3 -c "
from app.analytics.duckdb_manager import get_connection
conn = get_connection()

# Show all tables
tables = conn.execute('SHOW TABLES').fetchall()
print('Tables:', tables)

# Query the data
if tables:
    table_name = tables[0][0]
    rows = conn.execute(f'SELECT * FROM {table_name}').fetchdf()
    print(f'\nData in {table_name}:')
    print(rows)
    print(f'\nTotal rows: {len(rows)}')
"
```

✅ **Expected:** A table named `company_1_data` with 3 clean rows (John Doe deduplicated, empty row removed, column names normalized).

---

### Task B7: Test Bad File Upload

```bash
# Create an empty file
touch /tmp/empty.csv

# Try uploading it
curl -X POST http://localhost:8000/analytics/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/empty.csv"

# Check status — should be 'failed'
curl -X GET http://localhost:8000/analytics/status/2 \
  -H "Authorization: Bearer $TOKEN"
```

✅ **Expected:** `status: "failed"` with a meaningful `error_message`.

---

### Task B8: Test Unauthenticated Request

```bash
# No token — should get 401
curl -X POST http://localhost:8000/analytics/upload \
  -F "file=@/tmp/test_upload.csv"
```

✅ **Expected:** `401 Unauthorized`

---

### Task B9: Test Unsupported File Type

```bash
echo "hello" > /tmp/test.pdf
curl -X POST http://localhost:8000/analytics/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.pdf"
```

✅ **Expected:** `400 Bad Request — Unsupported file type: .pdf`

---

## 📁 Day 2 — Files Summary

| Developer | Action | File |
|-----------|--------|------|
| **A** | **REPLACE** | `app/analytics/service.py` (add `process_etl`) |
| **A** | **REPLACE** | `app/analytics/routes.py` (add BackgroundTasks + status endpoint) |
| **A** | Verify | `app/main.py` (no changes needed) |
| **B** | Test CSV upload | Terminal (curl) |
| **B** | Test bad file | Terminal (curl) |
| **B** | Test auth | Terminal (curl) |
| **B** | Test DuckDB data | Terminal (Python) |

---

## ✅ Final Verification Checklist

After all Day 2 tasks are done, both developers should verify these together:

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 1 | CSV upload succeeds | Upload CSV from browser → badge shows "Completed (N rows)" | ☐ |
| 2 | XLSX upload succeeds | Upload .xlsx → same result | ☐ |
| 3 | Raw BLOB in PostgreSQL | `psql`: `SELECT filename, status FROM raw_uploads;` | ☐ |
| 4 | Cleaned data in DuckDB | Python: `duckdb.connect('data/bizlytics.db').execute('SHOW TABLES')` | ☐ |
| 5 | Status transitions | Watch server logs: pending → processing → completed | ☐ |
| 6 | Failed upload shows error | Upload corrupt file → status = failed, error_message populated | ☐ |
| 7 | Company data isolation | Different company logins can't see each other's files | ☐ |
| 8 | Unauthenticated blocked | `curl POST /upload` without token → 401 | ☐ |
| 9 | Unsupported type blocked | Upload .pdf → 400 Bad Request | ☐ |

> **End of Day 2:** The ETL pipeline is fully integrated. HR users can upload files from the dashboard, the data is automatically cleaned and loaded into DuckDB, and the AI chatbot will be able to query it.
