from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import re
import jwt

import database
import models
from services.auth_service import decode_access_token
from services.scheduler_service import schedule_notification

router = APIRouter(prefix="/notifications", tags=["복약 알림"])
security = HTTPBearer()


# ── 공통: JWT에서 user_id 추출 ────────────────────────────────────
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    try:
        payload = decode_access_token(credentials.credentials)
        return int(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except Exception:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


def _parse_offset_minutes(instruction: str) -> int:
    """복약 지침 문자열에서 분 단위 오프셋 파싱. 예: '식후 30분' → 30"""
    match = re.search(r"(\d+)\s*분", instruction)
    return int(match.group(1)) if match else 30


# ── 요청 스키마 ────────────────────────────────────────────────────
class FcmTokenRequest(BaseModel):
    fcm_token: str

class MealCompletedRequest(BaseModel):
    meal_type: str                       # "breakfast" | "lunch" | "dinner"
    meal_time: Optional[datetime] = None # 생략 시 현재 시각 사용


# ── 1. FCM 토큰 등록/갱신 ─────────────────────────────────────────
@router.put(
    "/fcm-token",
    summary="FCM 토큰 등록/갱신",
    description="앱 실행 시 Firebase SDK가 발급한 FCM 토큰을 서버에 저장합니다. 로그인 후 호출하세요.",
)
def register_fcm_token(
    request: FcmTokenRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    user.fcm_token = request.fcm_token
    db.commit()
    return {"message": "FCM 토큰이 저장되었습니다.", "user_id": user_id}


# ── 2. 식사 완료 → 복약 알림 예약 ────────────────────────────────
@router.post(
    "/meal-completed",
    summary="식사 완료 알림 예약",
    description=(
        "식사 완료 버튼 클릭 시 호출. "
        "등록된 약 복약 지침(식후 N분)을 기반으로 알림 시각을 계산하고 APScheduler에 예약합니다."
    ),
)
def meal_completed(
    request: MealCompletedRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    meal_time = request.meal_time or datetime.now()

    # 식사 이벤트 기록
    meal_event = models.MealEvent(
        user_id=user_id,
        meal_type=request.meal_type,
        event_time=meal_time,
    )
    db.add(meal_event)
    db.flush()  # event_id 확보

    # 복약 목록 조회 (복약 기간 유효한 것만)
    user_medicines = (
        db.query(models.UserMedicine)
        .filter(
            models.UserMedicine.user_id == user_id,
            models.UserMedicine.start_date <= meal_time.date(),
        )
        .all()
    )

    if not user_medicines:
        db.rollback()
        return {"message": "등록된 복약 정보가 없습니다.", "scheduled": []}

    fcm_token = getattr(user, "fcm_token", None)
    scheduled = []

    for um in user_medicines:
        medicine = db.query(models.Medicine).filter(
            models.Medicine.id == um.medicine_id
        ).first()
        if not medicine:
            continue

        offset = _parse_offset_minutes(medicine.dosage_instruction or "")
        scheduled_time = meal_time + timedelta(minutes=offset)

        # 알림 로그 생성
        log = models.NotificationLog(
            user_id=user_id,
            user_medicine_id=um.user_medicine_id,
            meal_event_id=meal_event.event_id,
            scheduled_time=scheduled_time,
            is_taken=False,
        )
        db.add(log)
        db.flush()

        # FCM 토큰이 등록된 경우 APScheduler에 예약
        if fcm_token:
            schedule_notification(
                job_id=f"notif_{log.log_id}",
                fcm_token=fcm_token,
                medicine_name=medicine.pill_name,
                scheduled_time=scheduled_time,
                log_id=log.log_id,
            )

        scheduled.append({
            "medicine_name": medicine.pill_name,
            "offset_minutes": offset,
            "scheduled_time": scheduled_time.strftime("%H시 %M분"),
            "log_id": log.log_id,
            "fcm_scheduled": fcm_token is not None,
        })

    db.commit()
    return {
        "meal_type": request.meal_type,
        "meal_time": meal_time.strftime("%H:%M"),
        "scheduled": scheduled,
        "message": (
            f"{len(scheduled)}개 약 복약 알림이 예약되었습니다."
            if scheduled
            else "예약된 알림이 없습니다."
        ),
    }


# ── 3. 내 알림 로그 조회 ──────────────────────────────────────────
@router.get(
    "/logs",
    summary="복약 알림 로그 조회",
    description="최근 50건의 복약 알림 예약 내역과 복용 여부를 조회합니다.",
)
def get_notification_logs(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(database.get_db),
):
    logs = (
        db.query(models.NotificationLog)
        .filter(models.NotificationLog.user_id == user_id)
        .order_by(models.NotificationLog.scheduled_time.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "log_id": log.log_id,
            "scheduled_time": log.scheduled_time,
            "is_taken": log.is_taken,
            "medicine_name": (
                log.user_medicine.medicine.pill_name
                if log.user_medicine and log.user_medicine.medicine
                else "알 수 없음"
            ),
        }
        for log in logs
    ]


# ── 4. 복용 완료 체크 ─────────────────────────────────────────────
@router.patch(
    "/logs/{log_id}/taken",
    summary="복용 완료 체크",
    description="앱에서 복용 확인 버튼을 눌렀을 때 호출합니다.",
)
def mark_as_taken(
    log_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(database.get_db),
):
    log = (
        db.query(models.NotificationLog)
        .filter(
            models.NotificationLog.log_id == log_id,
            models.NotificationLog.user_id == user_id,
        )
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="해당 알림 로그를 찾을 수 없습니다.")
    log.is_taken = True
    db.commit()
    return {"message": "복용 완료로 기록되었습니다.", "log_id": log_id}
