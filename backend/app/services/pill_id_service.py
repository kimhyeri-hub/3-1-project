"""
식품의약품안전처_의약품 낱알식별 정보 API
Base URL: https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01
"""
import requests
from config import settings

API_KEY = settings.DUR_API_KEY or "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904"
PILL_ID_BASE = "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList"


def search_pill_by_name(item_name: str, num_of_rows: int = 10) -> dict:
    """약 이름으로 낱알식별 정보(색상/모양/식별문자/이미지) 조회."""
    params = {
        "serviceKey": API_KEY,
        "pageNo": 1,
        "numOfRows": num_of_rows,
        "type": "json",
        "itemName": item_name,
    }
    return _call_api(params)


def search_pill_by_appearance(
    color: str = None,
    shape: str = None,
    mark_front: str = None,
    mark_back: str = None,
    num_of_rows: int = 10,
) -> dict:
    """외형(색상·모양·식별문자)으로 낱알식별 정보 조회."""
    params = {
        "serviceKey": API_KEY,
        "pageNo": 1,
        "numOfRows": num_of_rows,
        "type": "json",
    }
    if color:
        params["colorClass1"] = color
    if shape:
        params["drgeShap"] = shape
    if mark_front:
        params["markFront"] = mark_front
    if mark_back:
        params["markBack"] = mark_back
    return _call_api(params)


def _call_api(params: dict) -> dict:
    try:
        r = requests.get(PILL_ID_BASE, params=params, timeout=10)
        r.encoding = "utf-8"
        data = r.json()
        body = data.get("body", {})
        items = body.get("items") or []
        total = body.get("totalCount", 0)
        result = [_parse_pill_item(item) for item in items]
        return {"items": result, "fetched": len(result), "total": total}
    except Exception as e:
        print(f"[낱알식별 API 오류] {e}")
        return {"items": [], "fetched": 0, "total": 0, "error": str(e)}


def _parse_pill_item(item: dict) -> dict:
    return {
        "item_name": item.get("ITEM_NAME", ""),
        "item_seq": item.get("ITEM_SEQ", ""),
        "entp_name": item.get("ENTP_NAME", ""),
        "chart": item.get("CHART", ""),               # 성상 (외형 설명)
        "color1": item.get("COLOR_CLASS1", ""),        # 색깔1
        "color2": item.get("COLOR_CLASS2", ""),        # 색깔2
        "shape": item.get("DRUG_SHAPE", ""),           # 모양
        "form": item.get("FORM_CODE_NAME", ""),        # 제형
        "mark_front": item.get("PRINT_FRONT", ""),     # 앞면 식별문자
        "mark_back": item.get("PRINT_BACK", ""),       # 뒷면 식별문자
        "img_url": item.get("ITEM_IMAGE", ""),         # 약 이미지 URL
        "class_name": item.get("CLASS_NAME", ""),      # 약효분류
        "etc_otc_name": item.get("ETC_OTC_NAME", ""), # 전문/일반의약품 구분
    }
