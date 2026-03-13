from pathlib import Path

import duckdb

# DuckDB database file location
DB_PATH = "data/bizlytics.db"

# Single global connection
_conn = None


def get_connection():
    """
    A1: Returns a single DuckDB connection.
    Creates database file if it doesn't exist.
    """
    global _conn

    if _conn is None:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = duckdb.connect(DB_PATH)

    return _conn


def create_table_for_company(company_id: int, df):
    """
    A2: Create company-specific table based on DataFrame schema.
    Dynamic table name: company_{id}_data
    """
    con = get_connection()
    table_name = f"company_{company_id}_data"

    # Create table if it doesn't exist using the DataFrame schema
    con.execute(f"CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM df LIMIT 0")
    return table_name


def load_dataframe(company_id: int, df):
    """
    A3: Load cleaned rows into the company table.
    """
    con = get_connection()
    table_name = create_table_for_company(company_id, df)

    # Insert data
    con.execute(f"INSERT INTO {table_name} SELECT * FROM df")
    return len(df)
