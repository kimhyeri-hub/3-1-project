from google.cloud import vision
from app.config import settings

def extract_text_from_image(contents):
    client = vision.ImageAnnotatorClient(client_options={"api_key": settings.GOOGLE_API_KEY})
    image = vision.Image(content=contents)
    response = client.text_detection(image=image)
    texts = response.text_annotations
    
    if texts:
        return texts[0].description
    return ""