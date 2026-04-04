import json
import urllib.parse
import boto3
import uuid

# Initialize the Transcribe client
transcribe_client = boto3.client('transcribe')

def lambda_handler(event, context):
    # 1. Extract the bucket and filename from the S3 event
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    except Exception as e:
        print(f"Error parsing S3 event: {e}")
        return {'statusCode': 400, 'body': 'Invalid S3 event format'}

    # 2. Define your output bucket (MAKE SURE THIS BUCKET EXISTS!)
    output_bucket = "lecsum-transcripts-outbox" 
    
    # 3. Construct the exact S3 URI dynamically
    file_uri = f"s3://{bucket}/{key}"
    
    # Generate a random ID for the job name
    job_name = f"lecsum-job-{uuid.uuid4().hex[:8]}"
    
    # 4. Determine the file format
    file_extension = key.split('.')[-1].lower()
    if file_extension not in ['mp3', 'wav', 'm4a', 'flac']:
         print(f"Skipping unsupported format: {file_extension}")
         return {'statusCode': 400, 'body': f'Unsupported format: {file_extension}'}

    print(f"Attempting to transcribe exact file: {file_uri}")
    print(f"Raw event: {json.dumps(event)}")
    # 5. Start the transcription job
    try:
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': file_uri},
            MediaFormat=file_extension,
            LanguageCode='en-US',
            OutputBucketName=output_bucket
        )
        
        print(f"Success! Job started: {job_name}")
        return {'statusCode': 200, 'body': f"Started {job_name}"}
        
    except Exception as e:
        print(f"Failed to start transcription: {e}")
        return {'statusCode': 500, 'body': str(e)}