"""
APScheduler 기반 복약 알림 스케줄러.
서버 시작 시 start_scheduler(), 종료 시 stop_scheduler() 호출.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    jobstores={"default": MemoryJobStore()},
    timezone="Asia/Seoul",
)


def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("[스케줄러] 시작됨")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[스케줄러] 종료됨")


def schedule_notification(
    job_id: str,
    fcm_token: str,
    medicine_name: str,
    scheduled_time: datetime,
    log_id: int,
):
    """지정 시각에 FCM 알림 발송 작업을 예약."""
    from services.notification_service import send_fcm_notification

    def _send():
        title = "복약 시간이에요 💊"
        body = f"'{medicine_name}' 복용 시간입니다."
        success = send_fcm_notification(fcm_token, title, body)
        logger.info(
            f"[스케줄러] log_id={log_id} 알림 {'발송 성공' if success else '발송 실패(로그 기록)'}"
        )

    scheduler.add_job(
        _send,
        trigger="date",
        run_date=scheduled_time,
        id=job_id,
        replace_existing=True,
        misfire_grace_time=300,  # 서버 재시작 등으로 5분 내 지연 시 그래도 실행
    )
    logger.info(
        f"[스케줄러] log_id={log_id} → {scheduled_time.strftime('%Y-%m-%d %H:%M:%S')} 예약 완료"
    )
