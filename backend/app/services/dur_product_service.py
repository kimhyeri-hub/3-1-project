"""
식품의약품안전처_의약품안전사용서비스(DUR)품목정보 API
Base URL: https://apis.data.go.kr/1471000/DURPrdlstInfoService02
"""
import requests
from config import settings

API_KEY = settings.DUR_API_KEY or "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904"
DUR_PRODUCT_BASE = "https://apis.data.go.kr/1471000/DURPrdlstInfoService02/getDurPrdlstInfoList"


def search_dur_product(item_name: str, num_of_rows: int = 20) -> dict:
    """
    약 이름으로 DUR 품목 정보 조회.
    DUR 유형(병용금기, 연령금기, 임부금기 등)과 금기내용 반환.
    """
    params = {
        "serviceKey": API_KEY,
        "pageNo": 1,
        "numOfRows": num_of_rows,
        "type": "json",
        "itemName": item_name,
    }
    try:
        r = requests.get(DUR_PRODUCT_BASE, params=params, timeout=10)
        r.encoding = "utf-8"
        data = r.json()
        body = data.get("body", {})
        items = body.get("items") or []
        total = body.get("totalCount", 0)
        result = [_parse_dur_item(item) for item in items]
        return {"items": result, "fetched": len(result), "total": total}
    except Exception as e:
        print(f"[DUR 품목정보 API 오류] {e}")
        return {"items": [], "fetched": 0, "total": 0, "error": str(e)}


def _parse_dur_item(item: dict) -> dict:
    return {
        "item_name": item.get("ITEM_NAME", ""),
        "item_seq": item.get("ITEM_SEQ", ""),
        "entp_name": item.get("ENTP_NAME", ""),
        "type_name": item.get("TYPE_NAME", ""),           # DUR 유형 (병용금기, 연령금기 등)
        "type_code": item.get("TYPE_CODE", ""),
        "prohbt_content": item.get("PROHBT_CONTENT", ""), # 금기내용
        "notification_date": item.get("NOTIFICATION_DATE", ""),
    }
