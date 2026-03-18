from fastapi import FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
import json

# 경로를 더 명확하게 지정하여 임포트합니다.
from app import models, schemas, database
from app.database import engine
# 서비스에서 함수를 직접 가져옵니다.
from app.services.ocr_service import extract_text_from_image
from app.services.gpt_service import analyze_medicine_text

# 서버 실행 시 DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="약쏘옥(Yaksok) API")

@app.post("/upload-pill")
async def upload_pill(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    # 1. 사진에서 텍스트 추출 (Google Vision)
    contents = await file.read()
    # ocr_service. 을 빼고 함수 이름만 사용합니다.
    raw_text = extract_text_from_image(contents)
    
    # 2. GPT를 통한 데이터 정제
    # gpt_service. 를 빼고 함수 이름만 사용합니다.
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