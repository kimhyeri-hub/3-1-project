from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


# ── 기존 Medicine 스키마 ──────────────────────────────────────────
class MedicineBase(BaseModel):
    pill_name: str
    dosage_instruction: str

class MedicineCreate(MedicineBase):
    pass

class Medicine(MedicineBase):
    id: int
    user_id: int
    warning_message: Optional[str] = None

    class Config:
        from_attributes = True


# ── 회원가입 ──────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    kakao_id: Optional[str] = None
    privacy_agreed: bool
    notification_agreed: bool = False


# ── 로그인 ────────────────────────────────────────────────────────
class UserLogin(BaseModel):
    email: str
    password: str


# ── 토큰 응답 ─────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── 내 정보 응답 ──────────────────────────────────────────────────
class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    notification_agreed: bool
    privacy_agreed: bool
    created_at: datetime

    class Config:
        from_attributes = True
