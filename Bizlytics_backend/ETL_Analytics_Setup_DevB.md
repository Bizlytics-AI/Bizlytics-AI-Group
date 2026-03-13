# ETL Analytics Setup — Developer B

## 1. Goal of B1–B5 in the Project
The goal is to build the data parsing and cleaning logic to transform raw uploaded files into clean datasets ready for DuckDB.

In this project, we process three types of files:
- **CSV**
- **Excel (.xlsx)**
- **JSON**

The pipeline for Developer B focuses on:
1. Parsing raw bytes into DataFrames.
2. Standardizing column names.
3. Handling missing data.
4. Removing duplicates.

## 2. What Specifically Build
Developer B builds the core ETL logic inside the service layer:
- **File Type Detection**: Automatic identification of file format.
- **Data Parsing**: Converters for CSV, Excel, and JSON.
- **Cleaning Engine**: A repeatable pipeline for data hygiene.

This enables the ETL pipeline to move data like this:
**Binary Content → Pandas DataFrame → Cleaned DataFrame**

## 3. B1 — Parse Raw Content
### Purpose
Raw files are stored as BLOBs in PostgreSQL. We need to convert these bytes into a format we can manipulate. We use `pandas` for this as it handles multiple formats natively.

### Implementation
File: `app/analytics/service.py`
```python
def _parse_to_dataframe(content: bytes, file_type: FileType) -> pd.DataFrame:
    buf = io.BytesIO(content)

    if file_type == FileType.csv:
        return pd.read_csv(buf, encoding="utf-8", on_bad_lines="skip")
    elif file_type == FileType.xlsx:
        return pd.read_excel(buf, engine="openpyxl")
    elif file_type == FileType.json:
        return pd.read_json(buf)

    raise ValueError(f"Unsupported file type: {file_type}")
```

## 4. B2 — Column Normalization
### Purpose
Clean data requires consistent column names for AI queries. We strip whitespace, convert to lowercase, and replace spaces with underscores.

### Implementation
Inside `clean_dataframe` function:
```python
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "_", regex=False)
)
```
Example: `" Employee ID "` → `"employee_id"`

## 5. B3 — Handle Null Values
### Purpose
Empty rows or columns can break analytical queries. We remove rows and columns that are entirely empty.

### Implementation
```python
df = df.dropna(how="all")  # Removes empty rows
df = df.dropna(axis=1, how="all")  # Removes empty columns
```

## 6. B4 — Deduplication & Value Polishing
### Purpose
Prevent double-counting in analytics by removing duplicate records and stripping whitespace from string values.

### Implementation
```python
# Deduplication
df = df.drop_duplicates().reset_index(drop=True)

# Value Polishing
df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)
```

## 7. B5 — ETL Logic Smoke Test
To verify the cleaning logic, we use `pytest` with a "messy" sample dataset.

File: `tests/test_etl_logic.py`
```python
def test_normalization_and_cleaning():
    data = {
        "  Employee ID ": [1, 2, 2, None],
        "Department": ["Sales", "HR", "HR", None]
    }
    df_raw = pd.DataFrame(data)
    df_clean = clean_dataframe(df_raw)
    
    assert "employee_id" in df_clean.columns
    assert len(df_clean) == 2  # Handled duplicate and null row
```

### Running the Test
```bash
pytest tests/test_etl_logic.py
```

## 8. System Architecture After B1–B5
After completing B1–B5, the system can:
1. Convert raw PostgreSQL bytes into DataFrames.
2. Produce "Golden Records" (clean, normalized data).
3. Prepare data for the `load_dataframe` call (Developer A).

Integration between A and B (triggering the ETL automatically) happens in the next phase.
