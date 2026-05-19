"""
FCM 푸시 알림 발송 서비스.
firebase-service-account.json이 없으면 로그만 출력하고 False 반환 (개발 단계 stub).
Firebase 프로젝트 생성 후 키 파일을 backend/firebase-service-account.json에 놓으면 실제 발송됨.
"""
import os
import logging

logger = logging.getLogger(__name__)
_firebase_initialized = False


def send_fcm_notification(fcm_token: str, title: str, body: str) -> bool:
    """FCM 푸시 알림 전송. 설정 파일 없으면 로그만 출력하고 False 반환."""
    global _firebase_initialized
    try:
        import firebase_admin
        from firebase_admin import messaging, credentials

        if not _firebase_initialized:
            key_path = os.path.join(
                os.path.dirname(__file__), "../../firebase-service-account.json"
            )
            if not os.path.exists(key_path):
                logger.warning(
                    "[FCM] firebase-service-account.json 없음 → 알림 미발송 "
                    f"(title='{title}', body='{body}')"
                )
                return False
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info(f"[FCM] 발송 성공 → {response}")
        return True

    except ImportError:
        logger.warning("[FCM] firebase-admin 미설치 → pip install firebase-admin")
        return False
    except Exception as e:
        logger.error(f"[FCM] 발송 실패: {e}")
        return False
