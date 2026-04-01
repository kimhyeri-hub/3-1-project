from google.cloud import vision
from config import settings

def extract_text_from_image(contents):
    """
    이미지 바이트 데이터를 받아 Google Vision API로 텍스트를 추출합니다.
    """
    # 설정파일(config.py)에 등록된 API 키를 사용합니다.
    client = vision.ImageAnnotatorClient(client_options={"api_key": settings.GOOGLE_API_KEY})
    image = vision.Image(content=contents)
    
    response = client.text_detection(image=image)
    texts = response.text_annotations
    
    if texts:
        # 추출된 전체 텍스트 반환
        return texts[0].description
    
    if response.error.message:
        raise Exception(f"Google Vision API 오류: {response.error.message}")
        
    return ""