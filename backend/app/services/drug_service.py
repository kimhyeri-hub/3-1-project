import requests

DATA_GO_KR_API_KEY = "7208917cccfaf482c9083726170baa42fb4d2302de944d4399620e1e69d03254"

def get_drug_detail_info(item_name: str):
    """
    식약처 'e약은요' API를 호출하여 약의 효능, 복용법, 주의사항을 가져옵니다.
    """
    url = 'http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList'
    
    # 필수 파라미터 설정
    params = {
        'serviceKey': DATA_GO_KR_API_KEY,
        'itemName': item_name,
        'type': 'json'  # 결과를 JSON 형식으로 받기
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        # 한글 깨짐 방지
        response.encoding = 'utf-8'
        data = response.json()
        
        # 데이터 구조 확인 후 추출
        if data.get('header', {}).get('resultCode') == '00':
            items = data.get('body', {}).get('items')
            if items:
                # 검색된 첫 번째 약 정보를 정리해서 반환
                item = items[0]
                return {
                    "efcy": item.get('efcyQesitm'),      # 효능
                    "use": item.get('useMethodQesitm'),  # 복용법
                    "atpn": item.get('atpnQesitm'),      # 주의사항
                    "intrc": item.get('intrcQesitm')     # 상호작용(같이 먹으면 안되는 것)
                }
        return None
    except Exception as e:
        print(f"식약처 API 호출 중 오류 발생: {e}")
        return None