from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import re
from datetime import datetime, timedelta
from pydantic import BaseModel

# 기존 프로젝트 경로 임포트
from app import models, schemas, database
from app.database import engine
from app.services.ocr_service import extract_text_from_image
from app.services.gpt_service import analyze_medicine_text

# 서버 실행 시 DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="약쏘옥(Yaksok) API", description="AI OCR 기반 맞춤형 복약 관리 서비스")

# --- [추가] 동적 스케줄링을 위한 Pydantic 모델 ---
class MealRequest(BaseModel):
    user_id: int
    meal_time: datetime | None = None

class MedicationScheduleResponse(BaseModel):
    user_id: int
    medication_name: str
    meal_time: datetime
    scheduled_time: datetime
    message: str

# --- [추가] 복용 지침 파싱 함수 ---
def parse_offset_minutes(instruction: str) -> int:
    """복용 지침(예: '식후 30분')에서 숫자만 추출하여 분 단위로 반환합니다."""
    match = re.search(r"(\d+)\s*분", instruction)
    if match:
        return int(match.group(1))
    return 30  # 기본값 30분

# --- 기존 기능: OCR 약 등록 ---
@app.post("/upload-pill")
async def upload_pill(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    """카메라로 찍은 약봉투 사진을 분석하여 DB에 등록합니다."""
    # 1. 사진에서 텍스트 추출 (Google Vision)
    contents = await file.read()
    raw_text = extract_text_from_image(contents)
    
    # 2. GPT를 통한 데이터 정제
    refined_data = analyze_medicine_text(raw_text)
    data_dict = json.loads(refined_data)
    
    # 3. DB에 저장
    new_medicine = models.Medicine(
        pill_name=data_dict.get('pill_name', '알 수 없는 약'),
        dosage_instruction=data_dict.get('dosage_instruction', '정보 없음')
    )
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    
    return {"message": "등록 완료!", "data": data_dict}

# --- [새로운 핵심 기능]: 식사 완료 및 시간 계산 ---
@app.post("/api/meal-completed", response_model=MedicationScheduleResponse)
async def meal_completed(request: MealRequest, db: Session = Depends(database.get_db)):
    """
    사용자가 '식사 완료' 버튼을 누르면 DB에서 복약 지침을 찾아 
    다음 복용 시각을 실시간으로 계산합니다.
    """
    # 1. DB에서 해당 유저의 최신 약 정보 가져오기 (MOCK 대신 실제 DB 조회)
    # 실제 환경에서는 user_id로 조회해야 하며, 여기서는 가장 최근 등록된 약을 예시로 잡습니다.
    user_medicine = db.query(models.Medicine).order_by(models.Medicine.id.desc()).first()
    
    if not user_medicine:
        raise HTTPException(
            status_code=404, 
            detail="등록된 복약 정보가 없습니다. 먼저 약을 등록해 주세요."
        )

    # 2. 시간 계산 로직
    meal_time = request.meal_time or datetime.now()
    offset_minutes = parse_offset_minutes(user_medicine.dosage_instruction)
    scheduled_time = meal_time + timedelta(minutes=offset_minutes)

    # 3. 안내 메시지 생성
    formatted_time = scheduled_time.strftime("%H시 %M분")
    message = (
        f"식사 완료 확인되었습니다. "
        f"'{user_medicine.pill_name}'은(는) {formatted_time}에 복용하세요!"
    )

    return MedicationScheduleResponse(
        user_id=request.user_id,
        medication_name=user_medicine.pill_name,
        meal_time=meal_time,
        scheduled_time=scheduled_time,
        message=message,
    )