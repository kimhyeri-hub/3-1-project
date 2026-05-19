from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.dur_product_service import search_dur_product
from services.pill_id_service import search_pill_by_name, search_pill_by_appearance
from services.ocr_service import extract_text_from_image
from services.gpt_service import analyze_medicine_text
import json

router = APIRouter(prefix="/drug-info", tags=["식약처 의약품 정보"])


# ── 요청 스키마 ────────────────────────────────────────────────────
class DrugNameRequest(BaseModel):
    item_name: str

class PillAppearanceRequest(BaseModel):
    color: Optional[str] = None
    shape: Optional[str] = None
    mark_front: Optional[str] = None
    mark_back: Optional[str] = None


# ── 1. DUR 품목정보 조회 (약 이름) ────────────────────────────────
@router.post(
    "/dur-product",
    summary="DUR 품목정보 조회",
    description="약 이름으로 DUR 유형(병용금기·연령금기·임부금기 등)과 금기내용을 조회합니다.",
)
def get_dur_product(request: DrugNameRequest):
    result = search_dur_product(request.item_name)
    if not result["items"]:
        return {
            "item_name": request.item_name,
            "fetched": 0,
            "total": 0,
            "items": [],
            "message": "DUR 품목 정보가 없거나 해당 약을 찾지 못했습니다.",
        }
    return {
        "item_name": request.item_name,
        "fetched": result["fetched"],
        "total": result["total"],
        "items": result["items"],
    }


# ── 2. 낱알식별 - 약 이름으로 조회 ───────────────────────────────
@router.post(
    "/pill-id/by-name",
    summary="낱알식별 정보 조회 (약 이름)",
    description="약 이름으로 색상·모양·식별문자·이미지 등 낱알식별 정보를 조회합니다.",
)
def get_pill_by_name(request: DrugNameRequest):
    result = search_pill_by_name(request.item_name)
    if not result["items"]:
        return {
            "item_name": request.item_name,
            "fetched": 0,
            "total": 0,
            "items": [],
            "message": "낱알식별 정보가 없거나 해당 약을 찾지 못했습니다.",
        }
    return {
        "item_name": request.item_name,
        "fetched": result["fetched"],
        "total": result["total"],
        "items": result["items"],
    }


# ── 3. 낱알식별 - 외형으로 조회 ──────────────────────────────────
@router.post(
    "/pill-id/by-appearance",
    summary="낱알식별 정보 조회 (외형)",
    description="색상·모양·식별문자를 입력하면 일치하는 약 목록을 반환합니다.",
)
def get_pill_by_appearance(request: PillAppearanceRequest):
    if not any([request.color, request.shape, request.mark_front, request.mark_back]):
        raise HTTPException(status_code=400, detail="색상, 모양, 식별문자 중 하나 이상 입력해야 합니다.")
    result = search_pill_by_appearance(
        color=request.color,
        shape=request.shape,
        mark_front=request.mark_front,
        mark_back=request.mark_back,
    )
    if not result["items"]:
        return {
            "fetched": 0,
            "total": 0,
            "items": [],
            "message": "해당 외형 조건에 맞는 약을 찾지 못했습니다.",
        }
    return {
        "fetched": result["fetched"],
        "total": result["total"],
        "items": result["items"],
    }


# ── 4. 낱알식별 - 사진 업로드 → OCR → 약 이름 인식 → 낱알식별 ──
@router.post(
    "/pill-id/by-photo",
    summary="사진으로 낱알식별 조회",
    description="약 사진을 업로드하면 OCR+GPT로 약 이름을 인식하고 낱알식별 정보를 반환합니다.",
)
async def get_pill_by_photo(file: UploadFile = File(...)):
    contents = await file.read()
    raw_text = extract_text_from_image(contents)
    if not raw_text:
        raise HTTPException(status_code=400, detail="사진에서 텍스트를 추출하지 못했습니다.")

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
            "items": [],
        }

    result = search_pill_by_name(pill_name)
    return {
        "ocr_raw_text": raw_text,
        "pill_name": pill_name,
        "fetched": result["fetched"],
        "total": result["total"],
        "items": result["items"],
        "message": (
            f"'{pill_name}'의 낱알식별 정보 {result['fetched']}개를 찾았습니다."
            if result["items"]
            else f"'{pill_name}'의 낱알식별 정보를 찾지 못했습니다."
        ),
    }
