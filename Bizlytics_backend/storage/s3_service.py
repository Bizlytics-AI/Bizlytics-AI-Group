import os
from uuid import uuid4
from storage.s3_client import s3
from dotenv import load_dotenv

load_dotenv()

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")


def upload_file_to_s3(file, filename, content_type="application/octet-stream"):
    try:
        unique_filename = f"{uuid4()}_{filename}"

        s3.upload_fileobj(
            file,
            BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": content_type
            }
        )

        file_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"

        return file_url

    except Exception as e:
        print("S3 Upload Error:", e)
        return None