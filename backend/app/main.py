from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import re
import sys
import os
from datetime import datetime, timedelta
from pydantic import BaseModel

# [핵심] 현재 실행되는 파일의 경로를 시스템 경로에 등록
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# 임포트 시 'app.'이나 '.'을 모두 제거한 형태
import models
import schemas
import database
from database import engine
from services.ocr_service import extract_text_from_image
from services.gpt_service import analyze_medicine_text

# 서버 실행 시 DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="약쏘옥(Yaksok) API", description="AI OCR 기반 맞춤형 복약 관리 서비스")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 이하 로직 동일 ---
class MealRequest(BaseModel):
    user_id: int
    meal_time: datetime | None = None

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

@app.post("/upload-pill")
async def upload_pill(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    contents = await file.read()
    raw_text = extract_text_from_image(contents)
    refined_data = analyze_medicine_text(raw_text)
    data_dict = json.loads(refined_data)
    
    new_medicine = models.Medicine(
        pill_name=data_dict.get('pill_name', '알 수 없는 약'),
        dosage_instruction=data_dict.get('dosage_instruction', '정보 없음')
    )
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    return {"message": "등록 완료!", "data": data_dict}

@app.post("/api/meal-completed", response_model=MedicationScheduleResponse)
async def meal_completed(request: MealRequest, db: Session = Depends(database.get_db)):
    user_medicine = db.query(models.Medicine).order_by(models.Medicine.id.desc()).first()
    if not user_medicine:
        raise HTTPException(status_code=404, detail="등록된 정보 없음")
    meal_time = request.meal_time or datetime.now()
    offset_minutes = parse_offset_minutes(user_medicine.dosage_instruction)
    scheduled_time = meal_time + timedelta(minutes=offset_minutes)
    message = f"식사 완료! '{user_medicine.pill_name}'은(는) {scheduled_time.strftime('%H시 %M분')}에 복용하세요!"
    return MedicationScheduleResponse(
        user_id=request.user_id, medication_name=user_medicine.pill_name,
        meal_time=meal_time, scheduled_time=scheduled_time, message=message
    )

@app.get("/")
async def root():
    return {"status": "running", "project": "Yaksok API"}