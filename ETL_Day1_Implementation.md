# ETL Sprint — Day 1: Foundation & Core Logic

> **Goal:** Developer A builds the DuckDB layer. Developer B builds the Pandas cleaning engine.
> Both work independently with zero blocking dependencies.

---

## What Already Exists (Don't Touch These Yet)

Before you start, understand what's already built:

| File | What It Does Now |
|------|-----------------|
| `app/analytics/models.py` | Defines `RawUpload` table with `content` (BLOB), `status`, `file_type`, `row_count`, `error_message` |
| `app/analytics/service.py` | `detect_file_type()` and `save_raw_upload()` — saves file to PostgreSQL with `status=completed` |
| `app/analytics/routes.py` | `POST /upload` and `GET /files` endpoints — currently no background processing |
| `app/core/config.py` | Environment variable loading — needs `DUCKDB_PATH` added |

---

## 🔧 Step 0: Install New Packages (Both Developers)

Run this FIRST before writing any code:

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
```

Add these 3 lines to `requirements.txt`:
```
pandas==2.2.2
openpyxl==3.1.2
duckdb==0.10.3
```

Then install:
```bash
pip install -r requirements.txt
```

Add DuckDB data path to `.env`:
```
DUCKDB_PATH=data/bizlytics.db
```

Add to `.gitignore`:
```
data/*.db
```

---

## 👨‍💻 Developer A — DuckDB Manager & Save Logic

### Task A1: Add `DUCKDB_PATH` to config.py

**File:** `app/core/config.py`

Add this line after the JWT settings:

```python
# DuckDB (Analytical Database)
DUCKDB_PATH: str = os.getenv("DUCKDB_PATH", "data/bizlytics.db")
```

The full updated `config.py` should look like:

```python
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv(
    "DATABASE_URL", "postgresql://postgres:1234@localhost:5432/bizlytics"
)

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# DuckDB (Analytical Database)
DUCKDB_PATH: str = os.getenv("DUCKDB_PATH", "data/bizlytics.db")
```

> **Note:** We removed the unused OTP and SMTP settings since they are legacy code.

---

### Task A2: Create `duckdb_manager.py`

**File:** `app/analytics/duckdb_manager.py` — **[NEW FILE]**

This is the DuckDB connection manager. All code that needs DuckDB must go through this module.

```python
"""
DuckDB Manager — Singleton connection to the analytical database.

DuckDB is an embedded database (like SQLite) optimised for analytical queries.
It stores data in a single .db file — no server, no port, no password needed.

Usage:
    from app.analytics.duckdb_manager import get_connection, load_dataframe
"""

import logging

import duckdb
from pathlib import Path

from app.core import config

logger = logging.getLogger(__name__)

# Singleton connection — reused across all requests
_conn = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """
    Get or create the singleton DuckDB connection.

    The first call creates the data/ directory if it doesn't exist,
    then opens (or creates) the .db file at the configured path.

    Returns:
        duckdb.DuckDBPyConnection: The active DuckDB connection.
    """
    global _conn

    if _conn is None:
        db_path = Path(config.DUCKDB_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)  # Create data/ dir

        _conn = duckdb.connect(str(db_path))
        logger.info(f"DuckDB connected at: {db_path}")

    return _conn


def load_dataframe(company_id: int, df) -> int:
    """
    Load a cleaned pandas DataFrame into a company-specific DuckDB table.

    Table naming convention: company_{id}_data
    Example: company_1_data, company_2_data

    This ensures complete data isolation between companies (multi-tenancy).

    How it works:
    1. If the table doesn't exist yet, CREATE it using the DataFrame's schema.
    2. INSERT all rows from the DataFrame into the table.

    Args:
        company_id: The company's database ID (from PostgreSQL).
        df: A cleaned pandas DataFrame ready to be loaded.

    Returns:
        int: The number of rows inserted.
    """
    con = get_connection()
    table_name = f"company_{company_id}_data"

    # Check if the table already exists
    existing_tables = [
        row[0] for row in con.execute("SHOW TABLES").fetchall()
    ]

    if table_name not in existing_tables:
        # First upload for this company — create the table from the DataFrame schema
        con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df WHERE 1=0")
        logger.info(f"Created DuckDB table: {table_name}")

    # Insert all rows from the DataFrame
    con.execute(f"INSERT INTO {table_name} SELECT * FROM df")
    row_count = len(df)

    logger.info(f"Loaded {row_count} rows into {table_name}")
    return row_count
```

**What each function does:**

| Function | Purpose |
|----------|---------|
| `get_connection()` | Returns a singleton DuckDB connection. Creates the `data/` folder and `.db` file on first call. |
| `load_dataframe(company_id, df)` | Creates a company-specific table (e.g., `company_1_data`) and inserts the cleaned DataFrame rows into it. |

---

### Task A3: Smoke Test DuckDB

Open a terminal and run this to verify DuckDB is working:

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
python3 -c "
from app.analytics.duckdb_manager import get_connection
conn = get_connection()
result = conn.execute('SELECT 42 AS answer').fetchall()
print('DuckDB is working! Result:', result)
# Expected output: DuckDB is working! Result: [(42,)]
"
```

✅ If you see `[(42,)]`, DuckDB is correctly set up.

---

## 👩‍💻 Developer B — Pandas Transformation Engine

### Task B1: Create `etl_transforms.py`

**File:** `app/analytics/etl_transforms.py` — **[NEW FILE]**

This is the data cleaning engine. It converts raw bytes (CSV/Excel/JSON) into a clean pandas DataFrame.

```python
"""
ETL Transforms — Parse raw file bytes and clean data using Pandas.

This module is the "Transform" step of the ETL pipeline.
It handles three file formats (CSV, XLSX, JSON) and applies
consistent cleaning rules to prepare data for DuckDB.

Usage:
    from app.analytics.etl_transforms import parse_file, clean_dataframe
"""

import io
import logging

import pandas as pd

from app.analytics.models import FileType

logger = logging.getLogger(__name__)


def parse_file(content: bytes, file_type: FileType) -> pd.DataFrame:
    """
    Parse raw file bytes into a pandas DataFrame.

    How it works:
    1. Wraps the raw bytes in a BytesIO buffer (in-memory file).
    2. Uses the appropriate pandas reader based on file_type.

    Args:
        content: Raw file bytes from PostgreSQL (the BLOB).
        file_type: The detected file type (csv, xlsx, json).

    Returns:
        pd.DataFrame: The raw, unparsed DataFrame (not yet cleaned).

    Raises:
        ValueError: If the file type is not supported.
        pd.errors.EmptyDataError: If the file has no data at all.
    """
    buf = io.BytesIO(content)

    if file_type == FileType.csv:
        # on_bad_lines='skip' → silently skip rows with too many/few columns
        # This prevents crashes on malformed CSV files
        df = pd.read_csv(buf, encoding="utf-8", on_bad_lines="skip")
        logger.info(f"Parsed CSV: {len(df)} rows, {len(df.columns)} columns")
        return df

    elif file_type == FileType.xlsx:
        # engine='openpyxl' → required for .xlsx files
        # openpyxl must be installed: pip install openpyxl
        df = pd.read_excel(buf, engine="openpyxl")
        logger.info(f"Parsed XLSX: {len(df)} rows, {len(df.columns)} columns")
        return df

    elif file_type == FileType.json:
        # pd.read_json handles both array-of-objects and record format
        df = pd.read_json(buf)
        logger.info(f"Parsed JSON: {len(df)} rows, {len(df.columns)} columns")
        return df

    raise ValueError(f"Unsupported file type: {file_type}")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply cleaning rules to a raw DataFrame.

    Cleaning steps (in order):
    1. Normalize column names: ' First Name ' → 'first_name'
    2. Drop rows where ALL cells are empty (blank separator rows)
    3. Drop columns where ALL cells are empty (Excel formatting artifacts)
    4. Remove duplicate rows (prevents double-counting in analytics)
    5. Strip whitespace from string values (fixes GROUP BY mismatches)
    6. Reset the index (clean row numbers after removals)

    Args:
        df: The raw DataFrame from parse_file().

    Returns:
        pd.DataFrame: The cleaned DataFrame ready for DuckDB.
    """
    original_rows = len(df)
    original_cols = len(df.columns)

    # Step 1: Normalize column names
    # ' Employee ID ' → 'employee_id'
    # 'First Name' → 'first_name'
    df.columns = (
        df.columns
        .str.strip()           # Remove leading/trailing spaces
        .str.lower()           # Convert to lowercase
        .str.replace(" ", "_", regex=False)  # Replace spaces with underscores
    )

    # Step 2: Drop rows where every single cell is empty
    # Common in Excel files that have blank separator rows
    df = df.dropna(how="all")

    # Step 3: Drop columns where every single cell is empty
    # Often caused by Excel formatting artifacts (empty columns at the end)
    df = df.dropna(axis=1, how="all")

    # Step 4: Remove duplicate rows
    # Prevents double-counting in aggregations like SUM(salary)
    df = df.drop_duplicates()

    # Step 5: Strip whitespace from string values
    # ' John ' → 'John'
    # Without this, GROUP BY would treat ' John' and 'John' as different
    df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    # Step 6: Reset the index
    # After dropping rows, the index has gaps (e.g., 0, 1, 5, 8)
    # reset_index makes it sequential again (0, 1, 2, 3)
    df = df.reset_index(drop=True)

    cleaned_rows = len(df)
    cleaned_cols = len(df.columns)

    logger.info(
        f"Cleaning complete: {original_rows}→{cleaned_rows} rows, "
        f"{original_cols}→{cleaned_cols} cols, "
        f"{original_rows - cleaned_rows} rows removed"
    )

    return df
```

**What each function does:**

| Function | Purpose |
|----------|---------|
| `parse_file(content, file_type)` | Takes raw bytes from PostgreSQL and converts them into a pandas DataFrame using the correct reader (CSV/XLSX/JSON). |
| `clean_dataframe(df)` | Applies 6 cleaning steps: normalize columns, drop empty rows/cols, deduplicate, strip whitespace, reset index. |

---

### Task B2: Test Locally with a Sample CSV

Create a test CSV file to verify the transforms work:

```bash
cat > /tmp/test_employees.csv << 'EOF'
 Employee ID , First Name , Last Name , Department , Salary 
1, John , Doe , Engineering , 85000
2, Jane , Smith , Marketing , 72000
3, John , Doe , Engineering , 85000
,,,,
4, Bob , Wilson , Sales , 68000
,,,,
EOF
```

This test file has:
- Messy column names with extra spaces
- Duplicate rows (John Doe appears twice)
- Completely empty rows (blank separator rows)

Now test:

```bash
cd /Users/m1/Desktop/Bizlytics-AI-Group/Bizlytics_backend
python3 -c "
from app.analytics.etl_transforms import parse_file, clean_dataframe
from app.analytics.models import FileType

# Read the test file
with open('/tmp/test_employees.csv', 'rb') as f:
    content = f.read()

# Step 1: Parse
df_raw = parse_file(content, FileType.csv)
print('=== RAW DATA ===')
print('Columns:', list(df_raw.columns))
print(df_raw)
print(f'Rows: {len(df_raw)}')

# Step 2: Clean
df_clean = clean_dataframe(df_raw)
print('\n=== CLEANED DATA ===')
print('Columns:', list(df_clean.columns))
print(df_clean)
print(f'Rows: {len(df_clean)}')
"
```

✅ **Expected output:**
- RAW: 6 rows with messy column names like ` Employee ID ` and duplicates
- CLEANED: 3 rows with clean column names like `employee_id`, no duplicates, no empty rows

---

## 📁 Day 1 — Files Summary

| Developer | Action | File |
|-----------|--------|------|
| **Both** | Install packages | `requirements.txt` |
| **Both** | Add DuckDB path | `.env` |
| **A** | Add config setting | `app/core/config.py` |
| **A** | **CREATE** | `app/analytics/duckdb_manager.py` |
| **A** | Smoke test | Terminal |
| **B** | **CREATE** | `app/analytics/etl_transforms.py` |
| **B** | Local CSV test | Terminal |

> **End of Day 1:** Both developers have independently tested their modules. Day 2 connects them together.
