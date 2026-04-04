import json
import urllib.parse
import boto3

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('lecsum-jobs')

OUTPUT_BUCKET = 'lecsum-transcripts-text'


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

    # 2. Skip Transcribe's write-access probe file
    if key.endswith('.temp'):
        return {'statusCode': 200, 'body': 'Skipped temp file'}

    print(f"Processing transcript: {key}")

    # 3. Read the Transcribe JSON from S3
    try:
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        data = json.loads(obj['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error reading from S3: {e}")
        return {'statusCode': 500, 'body': str(e)}

    # 4. Extract transcript text
    transcript = data['results']['transcripts'][0]['transcript']
    job_name = key.replace('.json', '')
    output_key = f"{job_name}.txt"

    # 5. Save plain text to lecsum-transcripts-text
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

    # 6. Find the DynamoDB record by jobName and update it to done
    try:
        # Scan for the record with this jobName
        # (In a larger app you'd use a GSI — fine for now)
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('jobName').eq(job_name)
        )
        items = response.get('Items', [])

        if items:
            upload_key = items[0]['uploadKey']
            table.update_item(
                Key={'uploadKey': upload_key},
                UpdateExpression='SET #s = :s, transcriptKey = :tk',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={
                    ':s': 'done',
                    ':tk': output_key,
                },
            )
            print(f"DynamoDB updated to done for uploadKey: {upload_key}")
        else:
            print(f"No DynamoDB record found for jobName: {job_name}")

    except Exception as e:
        print(f"DynamoDB update failed: {e}")
        # Transcript is saved — not fatal, log and continue

    return {
        'statusCode': 200,
        'body': json.dumps({'jobName': job_name, 'outputKey': output_key}),
    }