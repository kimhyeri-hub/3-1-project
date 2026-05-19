from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

import database
import models
import schemas
from services.auth_service import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ── 회원가입 ──────────────────────────────────────────────────────
@router.post("/register", response_model=schemas.TokenResponse, summary="회원가입")
def register(user_data: schemas.UserRegister, db: Session = Depends(database.get_db)):
    # 개인정보 동의 확인
    if not user_data.privacy_agreed:
        raise HTTPException(status_code=400, detail="개인정보 수집에 동의해야 합니다.")

    # 이메일 중복 확인
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        birth_date=user_data.birth_date,
        gender=user_data.gender,
        medical_history=user_data.medical_history,
        kakao_id=user_data.kakao_id,
        privacy_agreed=user_data.privacy_agreed,
        notification_agreed=user_data.notification_agreed,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.user_id, new_user.email)
    return {"access_token": token, "token_type": "bearer"}


# ── 로그인 ────────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.TokenResponse, summary="로그인")
def login(user_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(user.user_id, user.email)
    return {"access_token": token, "token_type": "bearer"}


# ── 내 정보 조회 ──────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserResponse, summary="내 정보 조회")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(database.get_db),
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except Exception:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user
