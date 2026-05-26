import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 백엔드 서버 IP를 본인 PC의 IP로 변경하세요 (cmd에서 ipconfig 확인)
// 예시: 'http://192.168.0.15:8000'
export const BASE_URL = 'http://192.168.229.83:8000';

const getToken = async () => {
  return await AsyncStorage.getItem('access_token');
};

export const api = {
  // ── 약 사진 분석 (인증 불필요) ──────────────────────────────────
  async uploadPill(imageUri) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    const res = await fetch(`${BASE_URL}/upload-pill`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    return res.json();
  },

  // ── 식사 완료 → 복약 알림 예약 (인증 필요) ──────────────────────
  async mealCompleted(mealType) {
    const token = await getToken();
    if (!token) return null; // 로그인 전이면 로컬 알림만 사용
    const res = await fetch(`${BASE_URL}/notifications/meal-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ meal_type: mealType }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // ── 알림 로그 조회 (인증 필요) ──────────────────────────────────
  async getNotificationLogs() {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${BASE_URL}/notifications/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  // ── 복용 완료 체크 (인증 필요) ──────────────────────────────────
  async markAsTaken(logId) {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${BASE_URL}/notifications/logs/${logId}/taken`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};
