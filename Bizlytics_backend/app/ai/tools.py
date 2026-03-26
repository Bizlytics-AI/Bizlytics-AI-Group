import logging
from typing import List, Dict, Any
import duckdb
from app.analytics.duckdb_manager import get_connection

logger = logging.getLogger(__name__)

def get_company_schema_info(company_id: int) -> str:
    """
    Returns a string description of the tables and columns available 
    for the specific company in DuckDB.
    """
    try:
        table_name = f"company_{company_id}_data"
        profile_name = f"company_{company_id}_profile"
        
        with get_connection() as con:
            # Check if tables exist
            tables = con.execute("SHOW TABLES").fetchall()
            table_list = [t[0] for t in tables]
            
            if table_name not in table_list:
                return f"No analytics data found for company {company_id}. Please upload a file first."
            
            # Get columns for the main data table
            columns = con.execute(f"DESCRIBE {table_name}").fetchall()
            col_desc = "\n".join([f"- {c[0]} ({c[1]})" for c in columns])
            
            schema_info = f"Table: {table_name}\nColumns:\n{col_desc}\n"
            
            # Add profile info if available
            if profile_name in table_list:
                schema_info += f"\nPre-computed Profile table available: {profile_name}"
                
            return schema_info
            
    except Exception as e:
        logger.error(f"Error fetching schema info: {e}")
        return f"Error retrieving data schema: {str(e)}"

def run_analytics_query(company_id: int, sql_query: str) -> List[Dict[str, Any]]:
    """
    Executes a read-only SQL query on the company's DuckDB data.
    Ensures the query only targets the specific company's table.
    """
    # 1. Basic Security: Only allow SELECT
    if not sql_query.strip().lower().startswith("select"):
        return [{"error": "Only SELECT queries are allowed for safety."}]

    # 2. Scope Enforcement: Ensure the query targets the correct company table
    target_table = f"company_{company_id}_data"
    profile_table = f"company_{company_id}_profile"
    
    # Simple check to make sure the AI isn't trying to guess other company IDs
    raw_query = sql_query.lower()
    if "company_" in raw_query and target_table not in raw_query and profile_table not in raw_query:
         return [{"error": f"Access Denied. You can only query your own tables: {target_table}"}]

    try:
        with get_connection() as con:
            result = con.execute(sql_query).df()
            return result.to_dict(orient="records")
            
    except Exception as e:
        logger.error(f"DuckDB Query Error: {e}")
        return [{"error": f"SQL Execution failed: {str(e)}"}]
