import duckdb
from pathlib import Path

# DuckDB database file location
DB_PATH = "data/bizlytics.db"

# Single global connection
_conn = None


def get_connection():
    """
    Returns a single DuckDB connection.
    Creates database file if it doesn't exist.
    """
    global _conn

    if _conn is None:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = duckdb.connect(DB_PATH)

    return _conn

def load_dataframe(company_id: int, df):
    """
    Load cleaned pandas dataframe into DuckDB.
    Each company gets its own table.
    """

    con = get_connection()

    table_name = f"company_{company_id}_data"

    # Create table if it doesn't exist
    con.execute(
        f"CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM df LIMIT 0"
    )

    # Insert data
    con.execute(
        f"INSERT INTO {table_name} SELECT * FROM df"
    )