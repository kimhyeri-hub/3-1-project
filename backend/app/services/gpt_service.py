import boto3
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

bedrock_client = boto3.client('bedrock-runtime', region_name=settings.BEDROCK_REGION)

def analyze_medicine_text(raw_text: str) -> str:
    if not raw_text.strip():
        return json.dumps({"error": "추출된 텍스트가 없습니다."})

    prompt = f"""
    당신은 복약 지도 전문 AI입니다.
    다음은 약 봉투나 처방전에서 추출된 텍스트입니다:
    "{raw_text}"

    이 내용을 바탕으로 반드시 아래의 JSON 형식으로만 응답해주세요.
    이미지에서 읽을 수 없는 항목은 null로 처리하고, 약봉투가 아닌 경우 {{"error": "약봉투를 인식할 수 없습니다"}}를 반환하세요.

    {{
      "medicineName": "약 이름",
      "ingredients": [
        {{ "name": "성분명", "amount": "용량", "effect": "주요 효능" }}
      ],
      "dosage": {{
        "perDose": "1회 복용량",
        "frequency": "하루 복용 횟수",
        "timing": "복용 시기 (예: 식후 30분)",
        "maxDaily": "1일 최대 복용량"
      }},
      "interactions": [
        {{ "substance": "상호작용 물질", "severity": "주의/위험", "description": "상세 설명" }}
      ],
      "warnings": ["주의사항1", "주의사항2"],
      "storageInfo": "보관 방법",
      "expiry": "유효기간 (이미지에 있는 경우)"
    }}
    """

    try:
        response = bedrock_client.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        result = json.loads(response['body'].read())
        return result['content'][0]['text']
    except Exception as e:
        print(f"Bedrock API 호출 중 오류 발생: {e}")
        return json.dumps({"error": "분석 실패", "details": str(e)})
