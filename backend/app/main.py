from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import re
import sys
import os
import uuid
import boto3
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
from boto3.dynamodb.conditions import Key

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

import database
from config import settings
from services.ocr_service import extract_text_from_image
from services.gpt_service import analyze_medicine_text
from services.drug_service import get_drug_detail_info

app = FastAPI(title="약쏘옥(Yaksok) API", description="AI OCR 및 식약처 데이터를 활용한 맞춤형 복약 관리")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

s3_client = boto3.client('s3', region_name=settings.DYNAMODB_REGION)

class MealRequest(BaseModel):
    user_id: int
    meal_time: Optional[datetime] = None

class MedicationScheduleResponse(BaseModel):
    user_id: int
    medication_name: str
    meal_time: datetime
    scheduled_time: datetime
    message: str

def parse_offset_minutes(instruction: str) -> int:
    match = re.search(r"(\d+)\s*분", instruction)
    if match:
        return int(match.group(1))
    return 30

@app.post("/api/v1/ocr/analyze")
async def upload_pill(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # S3에 이미지 업로드
        s3_key = f"uploads/{uuid.uuid4()}-{file.filename}"
        s3_client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=s3_key,
            Body=contents,
            ContentType=file.content_type or 'image/jpeg'
        )

        # Textract로 텍스트 추출
        raw_text = extract_text_from_image(contents)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="이미지에서 텍스트를 추출할 수 없습니다.")

        # Bedrock Claude로 분석
        refined_data = analyze_medicine_text(raw_text)
        data_dict = json.loads(refined_data)

        if "error" in data_dict:
            raise HTTPException(status_code=400, detail=data_dict["error"])

        pill_name = data_dict.get('medicineName', '알 수 없는 약')
        dosage_info = data_dict.get('dosage', {})
        dosage_instruction = f"{dosage_info.get('timing', '정보 없음')} ({dosage_info.get('frequency', '회')})"

        # 식약처 API
        drug_detail = get_drug_detail_info(pill_name)

        warning_info = "정보 없음"
        if drug_detail and drug_detail.get('atpn'):
            warning_info = drug_detail.get('atpn')
        elif data_dict.get('warnings'):
            warning_info = ", ".join(data_dict.get('warnings'))

        # DynamoDB 저장
        medicine_id = str(uuid.uuid4())
        database.MEDICINES_TABLE.put_item(Item={
            'medicine_id': medicine_id,
            'user_id': 'anonymous',
            'pill_name': pill_name,
            'dosage_instruction': dosage_instruction,
            'is_safe': True,
            'warning_message': warning_info,
            's3_key': s3_key,
            'created_at': datetime.now().isoformat()
        })

        return {
            "message": "등록 완료!",
            "medicine_id": medicine_id,
            "data": data_dict,
            "government_info": drug_detail
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"서버 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/meal-completed", response_model=MedicationScheduleResponse)
async def meal_completed(request: MealRequest):
    # 전체 medicines에서 최근 항목 조회 (기존 동작 유지)
    response = database.MEDICINES_TABLE.scan()
    items = sorted(
        response.get('Items', []),
        key=lambda x: x.get('created_at', ''),
        reverse=True
    )

    if not items:
        raise HTTPException(status_code=404, detail="등록된 정보 없음")

    user_medicine = items[0]
    meal_time = request.meal_time or datetime.now()
    offset_minutes = parse_offset_minutes(user_medicine['dosage_instruction'])
    scheduled_time = meal_time + timedelta(minutes=offset_minutes)

    message = f"식사 완료! '{user_medicine['pill_name']}'은(는) {scheduled_time.strftime('%H시 %M분')}에 복용하세요!"

    return MedicationScheduleResponse(
        user_id=request.user_id,
        medication_name=user_medicine['pill_name'],
        meal_time=meal_time,
        scheduled_time=scheduled_time,
        message=message
    )

@app.get("/")
async def root():
    return {"status": "running", "project": "Yaksok API"}
