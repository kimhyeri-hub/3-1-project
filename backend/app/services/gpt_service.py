from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def analyze_medicine_text(raw_text: str):
    """
    OCR로 추출된 텍스트를 GPT-4o에게 보내 정형 데이터로 변환합니다.
    """
    prompt = f"""
    다음은 약 봉투나 처방전에서 추출된 텍스트입니다:
    "{raw_text}"
    
    이 내용에서 1) 약품명, 2) 복약 지침(예: 식후 30분)만 추출해서 JSON 형식으로 응답해줘.
    결과 예시: {{"pill_name": "타이레놀", "dosage_instruction": "식후 30분"}}
    """
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    
    return response.choices[0].message.content