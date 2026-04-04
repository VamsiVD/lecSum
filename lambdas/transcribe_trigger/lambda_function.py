import json
import urllib.parse
import boto3
import uuid
from datetime import datetime, timezone

transcribe_client = boto3.client('transcribe')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('lecsum-jobs')

JOBS_TABLE = 'lecsum-jobs'
OUTPUT_BUCKET = 'lecsum-transcripts-outbox'

format_map = {
    'mp3': 'mp3',
    'wav': 'wav',
    'm4a': 'mp4',
    'flac': 'flac',
}


def lambda_handler(event, context):
    # 1. Parse the S3 event
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(
            event['Records'][0]['s3']['object']['key'], encoding='utf-8'
        )
    except Exception as e:
        print(f"Error parsing S3 event: {e}")
        return {'statusCode': 400, 'body': 'Invalid S3 event format'}

    # 2. Check file format
    file_extension = key.split('.')[-1].lower()
    if file_extension not in format_map:
        print(f"Skipping unsupported format: {file_extension}")
        return {'statusCode': 400, 'body': f'Unsupported format: {file_extension}'}

    media_format = format_map[file_extension]
    file_uri = f"s3://{bucket}/{key}"
    job_name = f"lecsum-job-{uuid.uuid4().hex[:8]}"
    file_name = key.split('/')[-1]

    print(f"Starting transcription for: {file_uri}")

    # 3. Start the Transcribe job
    try:
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': file_uri},
            MediaFormat=media_format,
            LanguageCode='en-US',
            OutputBucketName=OUTPUT_BUCKET,
        )
        print(f"Transcribe job started: {job_name}")
    except Exception as e:
        print(f"Failed to start transcription: {e}")
        # Write error state to DynamoDB so frontend knows it failed
        table.put_item(Item={
            'uploadKey': key,
            'jobName': job_name,
            'status': 'error',
            'errorMessage': str(e),
            'fileName': file_name,
            'createdAt': datetime.now(timezone.utc).isoformat(),
        })
        return {'statusCode': 500, 'body': str(e)}

    # 4. Write job record to DynamoDB
    try:
        table.put_item(Item={
            'uploadKey': key,
            'jobName': job_name,
            'status': 'transcribing',
            'fileName': file_name,
            'createdAt': datetime.now(timezone.utc).isoformat(),
        })
        print(f"DynamoDB record created for uploadKey: {key}")
    except Exception as e:
        print(f"Failed to write to DynamoDB: {e}")
        # Transcription is still running — not a fatal error
        # Log and continue rather than returning 500

    return {
        'statusCode': 200,
        'body': json.dumps({'jobName': job_name, 'uploadKey': key}),
    }