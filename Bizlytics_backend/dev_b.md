# ETL Analytics — Developer B (Day 1)

## 1. Goal of Developer B
The goal of Developer B is to build the **Transformation Engine**. This engine is responsible for taking raw binary data (CSV, XLSX, JSON) stored in PostgreSQL, parsing it into a structured format (Pandas DataFrame), and cleaning it so it is ready for high-performance AI queries in DuckDB.

---

## 2. Implementation Details

### **Core Logic: Data Transformation**
**File Path:** `app/analytics/service.py`

| ID | Task | Function | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **B1** | **File Parser** | `_parse_to_dataframe` | Uses `io.BytesIO` to read raw bytes. Supports `.csv`, `.xlsx` (via `openpyxl`), and `.json`. |
| **B2** | **Normalization** | `clean_dataframe` | Strips whitespace from headers, converts to lowercase, and replaces spaces with underscores (`Employee ID` -> `employee_id`). |
| **B3** | **Null Handling** | `clean_dataframe` | Automatically drops rows and columns that are 100% empty to prevent database bloat. |
| **B4** | **Deduplication** | `clean_dataframe` | Removes identical rows and resets the index to ensure data integrity. |

---

## 3. Workflow of the Transformation Engine

1. **Extraction:** The engine receives raw `bytes` from the PostgreSQL `raw_uploads` table.
2. **Parsing:** `_parse_to_dataframe` identifies the file type and creates a raw Pandas DataFrame.
3. **Cleaning:** `clean_dataframe` runs the following sequence:
   - Normalize Headers (Lowercase/Underscore)
   - Remove Empty Rows/Columns
   - Remove Duplicate Rows
   - Strip whitespace from all string values
4. **Ready for Load:** The result is a "clean" DataFrame that satisfies the constraints for DuckDB insertion (Day 2 task).

---

## 4. Verification & Testing (Day 1)

### **Developer B Test Suite**
**File Path:** `tests/test_etl_logic.py`

We implemented a test suite to verify the cleaning logic against "messy" data (headers with spaces, duplicate rows, all-null columns).

#### **How to run the tests:**
Ensure your virtual environment is active, then run:
```bash
./venv/bin/python -m pytest tests/test_etl_logic.py
```

### **Manual Verification Result:**
- **Status:** ✅ Passed
- **Test Case:** 2 items collected and 2 passed.
- **Outcome:** Confirmed that the engine successfully transforms "Employee ID" to "employee_id" and removes redundant data.

---

## 5. Environment Requirements
- **Pandas:** Used for all data manipulation.
- **Openpyxl:** Required for reading `.xlsx` files.
- **Pytest:** Required for running the verification suite.
- **DuckDB (1.1.3):** Upgraded from 0.10.3 to support Python 3.13 on macOS ARM.
