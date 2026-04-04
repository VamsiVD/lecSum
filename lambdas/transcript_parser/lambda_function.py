import json
import urllib.parse
import boto3

s3_client = boto3.client('s3')

OUTPUT_BUCKET = "lecsum-transcripts-text"


def lambda_handler(event, context):
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(
            event['Records'][0]['s3']['object']['key'], encoding='utf-8'
        )
    except Exception as e:
        print(f"Error parsing S3 event: {e}")
        return {'statusCode': 400, 'body': 'Invalid S3 event format'}

    if key.endswith('.temp'):
        return {'statusCode': 200, 'body': 'Skipped temp file'}

    print(f"Processing: {key}")

    try:
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        data = json.loads(obj['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error reading from S3: {e}")
        return {'statusCode': 500, 'body': str(e)}

    transcript = data['results']['transcripts'][0]['transcript']
    job_name = key.replace('.json', '')
    output_key = f"{job_name}.txt"

    try:
        s3_client.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=output_key,
            Body=transcript.encode('utf-8'),
            ContentType='text/plain',
        )
        print(f"Saved to s3://{OUTPUT_BUCKET}/{output_key}")
    except Exception as e:
        print(f"Error saving to S3: {e}")
        return {'statusCode': 500, 'body': str(e)}

    return {
        'statusCode': 200,
        'body': json.dumps({'jobName': job_name, 'outputKey': output_key}),
    }