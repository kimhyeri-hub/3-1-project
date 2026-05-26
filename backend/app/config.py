import os

class Settings:
    DYNAMODB_REGION = os.getenv("DYNAMODB_REGION", "ap-northeast-2")
    S3_BUCKET = os.getenv("S3_BUCKET", "sgu-yaksok-1-s3")
    BEDROCK_REGION = os.getenv("BEDROCK_REGION", "us-east-1")
    BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-opus-4-7-20250514-v1:0")

settings = Settings()
