"""
한국의약품안전관리원 병용금기약물 API 서비스
Base URL: https://api.odcloud.kr/api
엔드포인트: /15089525/v1/uddi:3f2efdac-942b-494e-919f-8bdc583f65ea (2024년 최신)

응답 필드: 금지번호, 고시일자, 금기사유,
          대상분류1/2, 성분명1/2, 성분코드1/2,
          업체명1/2, 품목명1/2, 품목코드1/2
"""
import requests
from urllib.parse import quote
from config import settings

DUR_API_KEY = settings.DUR_API_KEY or "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904"
DUR_BASE = "https://api.odcloud.kr/api/15089525/v1/uddi:3f2efdac-942b-494e-919f-8bdc583f65ea"

# 필드명 → URL 인코딩 미리 계산 (실제 API 응답 필드명 기준)
_FIELDS = {
    "제품명1": quote("제품명1", safe=""),
    "제품명2": quote("제품명2", safe=""),
    "성분명1": quote("성분명1", safe=""),
    "성분명2": quote("성분명2", safe=""),
}


def _search_by_field(field_key: str, value: str, per_page: int = 50) -> dict:
    """단일 필드로 DUR API 필터 검색. {"data": [...], "totalCount": N} 반환."""
    encoded_field = _FIELDS.get(field_key, quote(field_key, safe=""))
    encoded_value = quote(value, safe="")
    url = (
        f"{DUR_BASE}"
        f"?serviceKey={DUR_API_KEY}"
        f"&page=1&perPage={per_page}"
        f"&cond[{encoded_field}%3A%3ALIKE]={encoded_value}"
    )
    try:
        r = requests.get(url, timeout=10)
        r.encoding = "utf-8"
        data = r.json()
        return {"data": data.get("data", []), "totalCount": data.get("totalCount", 0)}
    except Exception as e:
        print(f"[DUR API 오류] {e}")
        return {"data": [], "totalCount": 0}


def _parse_item(item: dict) -> dict:
    return {
        "drug_a": item.get("제품명1", ""),
        "ingredient_a": item.get("성분명1", ""),
        "company_a": item.get("업체명1", ""),
        "drug_b": item.get("제품명2", ""),
        "ingredient_b": item.get("성분명2", ""),
        "company_b": item.get("업체명2", ""),
        "reason": item.get("금기사유", "금기사유 정보 없음"),
        "notice_date": item.get("공고일자", ""),
    }


def search_drug_interactions(drug_name: str) -> dict:
    """
    약 이름(제품명 또는 성분명)으로 병용금기 목록 조회.
    제품명1, 제품명2, 성분명1, 성분명2 모두 검색 후 중복 제거.
    반환값: {"interactions": [...], "fetched": N, "api_total": N}
    """
    results = []
    seen = set()
    api_total = 0

    for field in ["제품명1", "제품명2", "성분명1", "성분명2"]:
        res = _search_by_field(field, drug_name)
        if res["totalCount"] > api_total:
            api_total = res["totalCount"]
        for item in res["data"]:
            key = (item.get("제품코드1", ""), item.get("제품코드2", ""))
            if key not in seen:
                seen.add(key)
                results.append(_parse_item(item))

    return {"interactions": results, "fetched": len(results), "api_total": api_total}


def check_two_drugs(drug_a: str, drug_b: str) -> dict:
    """
    두 약 이름을 입력받아 병용금기 여부를 확인.
    drug_a 기준 병용금기 목록에서 drug_b가 포함된 항목 필터링.
    """
    result_a = search_drug_interactions(drug_a)
    interactions_a = result_a["interactions"]

    matched = []
    for item in interactions_a:
        target = drug_b.lower()
        fields_to_check = [
            item.get("drug_a", "").lower(),
            item.get("ingredient_a", "").lower(),
            item.get("drug_b", "").lower(),
            item.get("ingredient_b", "").lower(),
        ]
        if any(target in f for f in fields_to_check):
            matched.append(item)

    # 역방향 확인
    if not matched:
        result_b = search_drug_interactions(drug_b)
        for item in result_b["interactions"]:
            target = drug_a.lower()
            fields_to_check = [
                item.get("drug_a", "").lower(),
                item.get("ingredient_a", "").lower(),
                item.get("drug_b", "").lower(),
                item.get("ingredient_b", "").lower(),
            ]
            if any(target in f for f in fields_to_check):
                matched.append(item)

    return {
        "is_prohibited": len(matched) > 0,
        "matched_interactions": matched,
        "drug_a_all_interactions": interactions_a,
    }
