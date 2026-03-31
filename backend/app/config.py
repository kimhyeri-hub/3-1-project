import os
from pathlib import Path
from dotenv import load_dotenv

# 현재 config.py 파일의 위치를 기준으로 최상위 폴더(yaksok-project) 경로를 계산합니다.
base_dir = Path(__file__).resolve().parent.parent
env_path = base_dir / ".env"

# 경로를 직접 지정해서 .env 파일을 로드합니다.
load_dotenv(dotenv_path=env_path)

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_VISION_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

settings = Settings()

# 진단용: 서버 켤 때 키가 잘 들어왔는지 터미널에 찍어봅니다.
if not settings.OPENAI_API_KEY:
    print(f"❌ 설정 오류: .env 파일을 찾지 못했거나 키가 비어있습니다. (경로: {env_path})")
else:
    print(f"✅ 설정 로드 완료! OpenAI 키 확인됨.")