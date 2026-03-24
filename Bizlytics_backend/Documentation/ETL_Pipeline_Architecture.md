# Core ETL Pipeline Architecture

## 1. Overview
The ETL (Extract, Transform, Load) pipeline is the mathematical engine of Bizlytics. It is designed to ingest extremely messy, unpredictable raw Excel (`.xlsx`) and `.csv` files uploaded by HRs, and output pristine, strictly-typed data warehouses ready for lightning-fast AI querying.

## 2. The Step-by-Step Data Flow
The entire process is automated in the background to ensure the FastAPI server remains unblocked.

### Step A: Extraction (S3 & Pandas)
1. The raw file is securely downloaded directly into the worker's RAM from the AWS S3 private bucket.
2. The file is piped into a `pandas.DataFrame`.
3. **Smart Header Detection:** If a user uploads an Excel file with stylized meta-titles at the top, the system automatically scans downward until it detects the first row with at least 3 populated columns, designating that as the true "Header Row."

### Step B: Transformation (Cleaning & Sanitizing)
Before data ever touches the database, it undergoes aggressive sanitization in `app/analytics/service.py`:
1. **Column Normalization:** Spaces are replaced with underscores, and all text is lowercased (e.g., "Order Date" -> `order_date`).
2. **Null Stripping:** Entirely empty rows and columns are completely dropped.
3. **String Whitespace:** Invisible trailing spaces (`"Sales   "`) are stripped natively to prevent aggregation grouping errors.
4. **Type Casting Safeguards:** To prevent DuckDB `ConversionExceptions` (which occur if a mostly-numeric column contains a stray string like `"No"`), the pipeline forces any Pandas `object` columns explicitly into `String` types, preserving null values cleanly.

### Step C: Load (DuckDB)
1. The cleaned DataFrame is piped into `app/analytics/duckdb_manager.py`.
2. To prevent catastrophic schema appending errors (e.g., when a user uploads a radically different dataset), the old analytics table is structurally dropped (`DROP TABLE IF EXISTS`).
3. The table is recreated from scratch using DuckDB's native memory-optimized pandas reader (`CREATE TABLE AS SELECT * FROM df`), loading hundreds of thousands of rows in milliseconds.

### Step D: Auto-Profiling
1. Immediately after loading, `worker/aggregation.py` mathematically scans the freshly inserted data.
2. It generates a `{company}_profile` table detailing the total rows, total columns, and breaking down exactly how many columns are numeric vs. text vs. dates.
3. It pre-computes sums, averages, min, and max values for every strictly numeric column so the Frontend Dashboard charts can render instantly.
