import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from fastapi import HTTPException
from config import settings


def extract_text_from_image(contents: bytes) -> str:
    """
    이미지 바이트 데이터를 받아 AWS Textract로 텍스트를 추출합니다.
    액세스 키가 없으면 AWS CLI 자격증명(SSO/롤) 자동 사용.
    """
    kwargs = {"region_name": settings.AWS_REGION or "ap-northeast-2"}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    try:
        client = boto3.client("textract", **kwargs)
        response = client.detect_document_text(Document={"Bytes": contents})
        lines = [
            block["Text"]
            for block in response.get("Blocks", [])
            if block["BlockType"] == "LINE"
        ]
        return "\n".join(lines)

    except NoCredentialsError:
        raise HTTPException(
            status_code=503,
            detail="AWS 자격증명이 없습니다. .env에 AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY를 입력하거나 AWS CLI를 설정하세요."
        )
    except ClientError as e:
        code = e.response["Error"]["Code"]
        raise HTTPException(
            status_code=503,
            detail=f"AWS Textract 오류 ({code}): {e.response['Error']['Message']}"
        )
