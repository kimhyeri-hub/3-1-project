from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Time, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)
    kakao_id = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    medical_history = Column(Text, nullable=True)
    meal_time_breakfast = Column(Time, nullable=True)
    meal_time_lunch = Column(Time, nullable=True)
    meal_time_dinner = Column(Time, nullable=True)
    privacy_agreed = Column(Boolean, nullable=False, default=False)
    notification_agreed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.now)

    user_medicines = relationship("UserMedicine", back_populates="user")
    meal_events = relationship("MealEvent", back_populates="user")
    notification_logs = relationship("NotificationLog", back_populates="user")
    dur_alerts = relationship("DurAlert", back_populates="user")


class Medicine(Base):
    __tablename__ = "medicines"

    # DB 컬럼명은 medicine_id, Python에서는 id로 접근 (main.py 호환)
    id = Column("medicine_id", Integer, primary_key=True, autoincrement=True)
    # DB 컬럼명은 name, Python에서는 pill_name으로 접근 (main.py 호환)
    pill_name = Column("name", String(100), nullable=True)
    ingredient = Column(Text, nullable=True)
    # DB 컬럼명은 effect_summary, Python에서는 warning_message로 접근 (main.py 호환)
    warning_message = Column("effect_summary", Text, nullable=True)
    # DB 컬럼명은 dosage_guide, Python에서는 dosage_instruction으로 접근 (main.py 호환)
    dosage_instruction = Column("dosage_guide", String(100), nullable=True)
    shape = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    manufacturer = Column(String(100), nullable=True)
    public_code = Column(String(50), nullable=True)

    user_medicines = relationship("UserMedicine", back_populates="medicine")


class UserMedicine(Base):
    __tablename__ = "user_medicines"

    user_medicine_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.medicine_id"), nullable=True)
    dosage_time = Column(String(20), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    user = relationship("User", back_populates="user_medicines")
    medicine = relationship("Medicine", back_populates="user_medicines")
    notification_logs = relationship("NotificationLog", back_populates="user_medicine")


class MealEvent(Base):
    __tablename__ = "meal_events"

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    meal_type = Column(String(20), nullable=False)
    event_time = Column(DateTime, nullable=False, default=datetime.datetime.now)

    user = relationship("User", back_populates="meal_events")
    notification_logs = relationship("NotificationLog", back_populates="meal_event")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    user_medicine_id = Column(Integer, ForeignKey("user_medicines.user_medicine_id"), nullable=False)
    meal_event_id = Column(Integer, ForeignKey("meal_events.event_id"), nullable=True)
    scheduled_time = Column(DateTime, nullable=False)
    is_taken = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="notification_logs")
    user_medicine = relationship("UserMedicine", back_populates="notification_logs")
    meal_event = relationship("MealEvent", back_populates="notification_logs")


class DurAlert(Base):
    __tablename__ = "dur_alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    medicine_a_id = Column(Integer, ForeignKey("medicines.medicine_id"), nullable=False)
    medicine_b_id = Column(Integer, ForeignKey("medicines.medicine_id"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    checked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="dur_alerts")
    medicine_a = relationship("Medicine", foreign_keys=[medicine_a_id])
    medicine_b = relationship("Medicine", foreign_keys=[medicine_b_id])
