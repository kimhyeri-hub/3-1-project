from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.ocr_service import extract_text_from_image
from services.gpt_service import analyze_medicine_text
from services.dur_service import search_drug_interactions, check_two_drugs
import json

router = APIRouter(prefix="/dur", tags=["DUR 병용금기"])


# ── 요청 스키마 ────────────────────────────────────────────────────
class SingleDrugRequest(BaseModel):
    drug_name: str


class TwoDrugsRequest(BaseModel):
    drug_a: str
    drug_b: str


# ── 1. 단일 약 병용금기 목록 조회 (약 이름 텍스트 입력) ───────────
@router.post(
    "/search",
    summary="단일 약의 병용금기 목록 조회",
    description="약 이름을 입력하면 그 약과 병용 금기인 약 목록을 반환합니다.",
)
def search_single_drug(request: SingleDrugRequest):
    result = search_drug_interactions(request.drug_name)
    interactions = result["interactions"]

    if not interactions:
        return {
            "drug_name": request.drug_name,
            "fetched": 0,
            "api_total": 0,
            "interactions": [],
            "message": "병용금기 정보가 없거나 API에서 해당 약을 찾지 못했습니다.",
        }

    return {
        "drug_name": request.drug_name,
        "fetched": result["fetched"],
        "api_total": result["api_total"],
        "note": "fetched = 현재 가져온 수 / api_total = DB 전체 해당 건수",
        "interactions": interactions,
    }


# ── 2. 두 약 병용금기 여부 확인 (약 이름 텍스트 입력) ─────────────
@router.post(
    "/check",
    summary="두 약의 병용금기 여부 확인",
    description="두 약 이름을 입력하면 함께 복용해도 되는지 확인합니다.",
)
def check_interaction(request: TwoDrugsRequest):
    result = check_two_drugs(request.drug_a, request.drug_b)

    if result["is_prohibited"]:
        message = f"⚠️ '{request.drug_a}'와(과) '{request.drug_b}'는 병용 금기입니다. 함께 복용하지 마세요."
    else:
        message = f"'{request.drug_a}'와(과) '{request.drug_b}' 사이의 직접적인 병용금기는 확인되지 않았습니다."

    return {
        "drug_a": request.drug_a,
        "drug_b": request.drug_b,
        "is_prohibited": result["is_prohibited"],
        "message": message,
        "matched_interactions": result["matched_interactions"],
        "drug_a_all_interactions": result["drug_a_all_interactions"],
    }


# ── 3. 사진으로 약 이름 인식 후 병용금기 조회 ─────────────────────
@router.post(
    "/check-by-photo",
    summary="사진으로 약 인식 후 병용금기 조회",
    description="약 사진을 업로드하면 OCR+GPT로 약 이름을 인식하고 병용금기 정보를 반환합니다.",
)
async def check_by_photo(file: UploadFile = File(...)):
    # 1. OCR로 텍스트 추출
    contents = await file.read()
    raw_text = extract_text_from_image(contents)

    if not raw_text:
        raise HTTPException(status_code=400, detail="사진에서 텍스트를 추출하지 못했습니다.")

    # 2. GPT로 약 이름 추출
    refined_data = analyze_medicine_text(raw_text)
    try:
        data_dict = json.loads(refined_data)
    except Exception:
        raise HTTPException(status_code=500, detail="GPT 분석 결과 파싱 실패")

    pill_name = data_dict.get("pill_name", "")
    if not pill_name or pill_name == "알 수 없는 약":
        return {
            "ocr_raw_text": raw_text,
            "pill_name": pill_name,
            "message": "약 이름을 인식하지 못했습니다. 선명한 사진으로 다시 시도해주세요.",
            "interactions": [],
        }

    # 3. 병용금기 조회
    interactions = search_drug_interactions(pill_name)

    return {
        "ocr_raw_text": raw_text,
        "pill_name": pill_name,
        "dosage_instruction": data_dict.get("dosage_instruction", ""),
        "total_interactions": len(interactions),
        "interactions": interactions,
        "message": (
            f"'{pill_name}'의 병용금기 약이 {len(interactions)}개 확인되었습니다."
            if interactions
            else f"'{pill_name}'의 병용금기 정보가 없습니다."
        ),
    }


# ── 4. 두 약을 각각 사진으로 업로드하여 병용금기 확인 ─────────────
@router.post(
    "/check-two-photos",
    summary="두 약 사진으로 병용금기 확인",
    description="두 약의 사진을 각각 업로드하면 OCR+GPT로 이름을 인식하고 병용금기 여부를 확인합니다.",
)
async def check_two_photos(
    file_a: UploadFile = File(..., description="첫 번째 약 사진"),
    file_b: UploadFile = File(..., description="두 번째 약 사진"),
):
    # 첫 번째 약 인식
    contents_a = await file_a.read()
    raw_a = extract_text_from_image(contents_a)
    data_a = json.loads(analyze_medicine_text(raw_a))
    name_a = data_a.get("pill_name", "알 수 없는 약")

    # 두 번째 약 인식
    contents_b = await file_b.read()
    raw_b = extract_text_from_image(contents_b)
    data_b = json.loads(analyze_medicine_text(raw_b))
    name_b = data_b.get("pill_name", "알 수 없는 약")

    if "알 수 없는 약" in (name_a, name_b):
        return {
            "drug_a": name_a,
            "drug_b": name_b,
            "message": "한 개 이상의 약을 인식하지 못했습니다. 더 선명한 사진으로 시도해주세요.",
            "is_prohibited": None,
        }

    # 병용금기 확인
    result = check_two_drugs(name_a, name_b)

    if result["is_prohibited"]:
        message = f"⚠️ '{name_a}'와(과) '{name_b}'는 병용 금기입니다!"
    else:
        message = f"'{name_a}'와(과) '{name_b}' 사이의 직접적인 병용금기는 확인되지 않았습니다."

    return {
        "drug_a": name_a,
        "drug_b": name_b,
        "is_prohibited": result["is_prohibited"],
        "message": message,
        "matched_interactions": result["matched_interactions"],
    }
