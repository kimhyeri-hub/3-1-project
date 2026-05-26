import boto3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

textract_client = boto3.client('textract', region_name=settings.DYNAMODB_REGION)

def extract_text_from_image(image_bytes: bytes) -> str:
    response = textract_client.detect_document_text(
        Document={'Bytes': image_bytes}
    )
    lines = [
        block['Text']
        for block in response['Blocks']
        if block['BlockType'] == 'LINE'
    ]
    return '\n'.join(lines)

def extract_text_from_s3(bucket: str, key: str) -> str:
    response = textract_client.detect_document_text(
        Document={'S3Object': {'Bucket': bucket, 'Name': key}}
    )
    lines = [
        block['Text']
        for block in response['Blocks']
        if block['BlockType'] == 'LINE'
    ]
    return '\n'.join(lines)
