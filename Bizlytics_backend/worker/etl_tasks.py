#It connects to the database, downloads the file, cleans it, classifies the columns, and loads it into DuckDB
import logging
import json
import time
from sqlalchemy import text
from worker.celery_app import celery_app
from app.database import SessionLocal
from app.analytics.models import RawUpload, UploadStatus
from app.analytics.service import _parse_to_dataframe, clean_dataframe
from app.analytics.duckdb_manager import load_dataframe
from storage.s3_service import download_file_from_s3
from worker.column_classifier import classify_columns
from worker.aggregation import run_aggregations

from app.auth.models import Company

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def process_etl(self, upload_id: int, company_id: int):
    """
    Main background task to process a file from S3 to DuckDB.
    """
    db = SessionLocal()
    start_time = time.time()
    
    try:
        # 1. Fetch the actual schema name from public.companies
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.error(f"Company {company_id} not found in public.companies")
            return
            
        schema_name = company.schema_name
        logger.info(f"Processing ETL for company: {company.company_name} (Schema: {schema_name})")
        
        # 2. Set Tenant Schema Scope for this session
        db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # 2. Get Upload Record
        upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()
        if not upload:
            logger.error(f"Upload {upload_id} not found")
            return
            
        # Update Status to processing
        upload.status = UploadStatus.processing
        db.commit()
        
        # 3. Download File from S3
        logger.info(f"Downloading file for upload {upload_id}")
        content = download_file_from_s3(upload.s3_url)
        
        # 4. Parse to Dataframe
        df_raw = _parse_to_dataframe(content, upload.file_type)
        
        # 5. Clean Dataframe
        df_clean = clean_dataframe(df_raw)
        
        # 6. Classify Columns (Mapping)
        mapping = classify_columns(df_clean.columns.tolist())
        
        # 7. Update Metadata in Postgres
        upload.column_count = len(df_clean.columns)
        upload.columns_metadata = json.dumps(df_clean.columns.tolist())
        upload.column_mapping = json.dumps(mapping)
        db.commit()
        
        # 8. Load into DuckDB
        logger.info(f"Loading {len(df_clean)} rows into DuckDB")
        load_dataframe(company_id, df_clean)
        
        # 9. Run Aggregations
        logger.info(f"Running aggregations for company {company_id}")
        run_aggregations(company_id)
        
        # 10. Finalize Status
        upload.status = UploadStatus.completed
        upload.row_count = len(df_clean)
        db.commit()
        
        elapsed = time.time() - start_time
        logger.info(f"ETL Completed in {elapsed:.2f}s for upload {upload_id}")
        
    except Exception as exc:
        db.rollback()
        logger.error(f"ETL Failed for upload {upload_id}: {exc}")
        
        # Update status to failed
        upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()
        if upload:
            upload.status = UploadStatus.failed
            db.commit()
            
        # Retry logic for network/S3 issues
        raise self.retry(exc=exc, countdown=60)
        
    finally:
        db.close()
