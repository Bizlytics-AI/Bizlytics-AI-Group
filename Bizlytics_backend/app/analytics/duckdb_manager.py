# from pathlib import Path

# import duckdb

# # DuckDB database file location
# DB_PATH = "data/bizlytics.db"

# # Single global connection
# _conn = None


# def get_connection():
#     """
#     A1: Returns a single DuckDB connection.
#     Creates database file if it doesn't exist.
#     """
#     global _conn

#     if _conn is None:
#         Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
#         _conn = duckdb.connect(DB_PATH)

#     return _conn


# def create_table_for_company(company_id: int, df):
#     """
#     A2: Create company-specific table based on DataFrame schema.
#     Dynamic table name: company_{id}_data
#     """
#     con = get_connection()
#     table_name = f"company_{company_id}_data"

#     # Create table if it doesn't exist using the DataFrame schema
#     con.execute(f"CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM df LIMIT 0")
#     return table_name


# def load_dataframe(company_id: int, df):
#     """
#     A3: Load cleaned rows into the company table.
#     """
#     con = get_connection()
#     table_name = create_table_for_company(company_id, df)

#     # Insert data
#     con.execute(f"INSERT INTO {table_name} SELECT * FROM df")
#     return len(df)
import threading
import contextlib
from pathlib import Path
import duckdb

# DuckDB database file location
DB_PATH = "data/bizlytics.db"

# Global lock for thread safety within the same process
_db_lock = threading.Lock()

@contextlib.contextmanager
def get_connection(read_only=False):
    """
    Yields a short-lived DuckDB connection to prevent file locking across processes.
    """
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(DB_PATH, read_only=read_only)
    try:
        yield conn
    finally:
        conn.close()

def load_dataframe(company_id: int, df):
    """
    Loads cleaned rows into the company table safely.
    Uses short-lived connection and closes it immediately.
    """
    table_name = f"company_{company_id}_data"
    
    with _db_lock:
        with get_connection() as con:
            # Drop old table to prevent schema conflicts when uploading a completely new dataset
            con.execute(f"DROP TABLE IF EXISTS {table_name}")
            # Create table and insert all data safely from the new schema
            con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")
            
    return len(df)
