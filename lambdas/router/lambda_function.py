import os
import urllib.parse
import uuid
from datetime import datetime, timezone

import boto3

s3_client = boto3.client("s3")
transcribe_client = boto3.client("transcribe")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "lecsum-jobs")
TRANSCRIBE_OUTPUT_BUCKET = os.environ.get(
    "TRANSCRIBE_OUTPUT_BUCKET", "lecsum-transcripts-outbox"
)

AUDIO_FORMAT_MAP = {
    "mp3": "mp3",
    "wav": "wav",
    "flac": "flac",
    "ogg": "ogg",
    "amr": "amr",
    "webm": "webm",
    "m4a": "mp4",
    "mp4": "mp4",
}

DOCUMENT_FORMATS = {"pdf", "docx", "pptx", "jpg", "jpeg", "png", "tiff", "tif"}


def write_dynamo(upload_key: str, file_name: str, status: str, job_name: str = ""):
    table = dynamodb.Table(TABLE_NAME)
    item = {
        "uploadKey": upload_key,
        "fileName": file_name,
        "status": status,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if job_name:
        item["jobName"] = job_name
    table.put_item(Item=item)


def handle_audio(bucket: str, key: str, upload_key: str, file_name: str, ext: str):
    media_format = AUDIO_FORMAT_MAP.get(ext, "mp3")
    job_name = f"lecsum-job-{uuid.uuid4().hex[:8]}"
    file_uri = f"s3://{bucket}/{key}"

    write_dynamo(upload_key, file_name, "transcribing", job_name)

    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": file_uri},
        MediaFormat=media_format,
        LanguageCode="en-US",
        OutputBucketName=TRANSCRIBE_OUTPUT_BUCKET,
    )
    print(f"Audio: started Transcribe job {job_name}")


def handle_document(upload_key: str, file_name: str):
    # Mark as queued — Next.js /api/extract handles vision extraction
    write_dynamo(upload_key, file_name, "extracting")
    print(f"Document queued for vision extraction: {file_name}")


def lambda_handler(event, context):
    try:
        bucket = event["Records"][0]["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(
            event["Records"][0]["s3"]["object"]["key"], encoding="utf-8"
        )
    except Exception as e:
        print(f"Error parsing S3 event: {e}")
        return {"statusCode": 400, "body": "Invalid S3 event"}

    ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    file_name = key.split("/")[-1]
    upload_key = key

    print(f"Router received: {key} (ext={ext})")

    try:
        if ext in AUDIO_FORMAT_MAP:
            handle_audio(bucket, key, upload_key, file_name, ext)
        elif ext in DOCUMENT_FORMATS:
            handle_document(upload_key, file_name)
        else:
            print(f"Unsupported format: {ext}")
            return {"statusCode": 400, "body": f"Unsupported format: {ext}"}

        return {"statusCode": 200, "body": f"Processed {file_name}"}

    except Exception as e:
        print(f"Error processing {file_name}: {e}")
        return {"statusCode": 500, "body": str(e)}