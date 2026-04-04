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
from services.drug_service import get_drug_detail_info
from routers import auth as auth_router

# 서버 실행 시 DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="약쏘옥(Yaksok) API", description="AI OCR 및 식약처 데이터를 활용한 맞춤형 복약 관리")

app.include_router(auth_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- [수정된 부분] 사진 업로드 및 정보 등록 API ---
@app.post("/upload-pill")
async def upload_pill(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    # 1. 사진에서 텍스트 추출 (Google Vision OCR)
    contents = await file.read()
    raw_text = extract_text_from_image(contents)
    
    # 2. GPT가 텍스트 분석 (약 이름, 복약 지침 추출)
    refined_data = analyze_medicine_text(raw_text)
    data_dict = json.loads(refined_data)
    
    pill_name = data_dict.get('pill_name', '알 수 없는 약')
    dosage_instruction = data_dict.get('dosage_instruction', '정보 없음')
    
    # 3. [추가] 식약처 API 호출하여 상세 정보 가져오기
    drug_detail = get_drug_detail_info(pill_name)
    
    # 만약 식약처 데이터가 있다면 주의사항(atpn)을 사용하고, 없으면 GPT 결과를 사용
    warning_info = "정보 없음"
    if drug_detail:
        # 효능(efcy)과 주의사항(atpn)을 합쳐서 저장하거나 선택 가능
        warning_info = drug_detail.get('atpn', '주의사항 정보 없음')
    
    # 4. DB에 최종 저장
    new_medicine = models.Medicine(
        pill_name=pill_name,
        dosage_instruction=dosage_instruction,
        warning_message=warning_info  # 식약처에서 가져온 주의사항 저장
    )
    
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    
    return {
        "message": "등록 완료!", 
        "data": data_dict,
        "government_info": drug_detail  # 프론트엔드 확인용 식약처 데이터 포함
    }

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
        user_id=request.user_id, 
        medication_name=user_medicine.pill_name,
        meal_time=meal_time, 
        scheduled_time=scheduled_time, 
        message=message
    )

@app.get("/")
async def root():
    return {"status": "running", "project": "Yaksok API"}