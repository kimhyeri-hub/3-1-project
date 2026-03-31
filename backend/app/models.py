#DB 테이블 설계 (User, Appointment ..등)
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True)
    # 실제 생활 패턴(식사 시간 등)을 저장할 필드
    last_meal_time = Column(DateTime, nullable=True)

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pill_name = Column(String(100))  # OCR로 추출된 약 이름
    dosage_instruction = Column(String(200))  # GPT가 분석한 복약 지침 (예: 식후 30분)
    
    # 식약처 DUR 검증 결과 저장 [cite: 7]
    is_safe = Column(Boolean, default=True) 
    warning_message = Column(String(500), nullable=True)

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    # 동적으로 계산된 다음 복용 예정 시간 [cite: 7]
    scheduled_time = Column(DateTime)
    is_taken = Column(Boolean, default=False)