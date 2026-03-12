# ETL Analytics Installed Packages

For the ETL and Analytics infrastructure implemented in steps A1–A5, the following Python packages are required:

| Package | Purpose | Installation Command |
| :--- | :--- | :--- |
| **duckdb** | Analytical database engine for storing cleaned data | `pip install duckdb` |
| **pandas** | Data manipulation and cleaning | `pip install pandas` |
| **openpyxl** | Engine for reading/writing Excel (.xlsx) files | `pip install openpyxl` |
| **python-multipart** | Required by FastAPI to handle file uploads | `pip install python-multipart` |
| **sqlalchemy** | ORM for PostgreSQL operations (already installed) | `pip install sqlalchemy` |
| **psycopg2-binary** | PostgreSQL database adapter (already installed) | `pip install psycopg2-binary` |

### Installation Summary
To ensure all analytics features work correctly, run the following in your virtual environment:
```bash
pip install duckdb pandas openpyxl python-multipart
```
