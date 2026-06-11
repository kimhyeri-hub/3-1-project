import { cancelNotification } from './notificationService';
import { getUserId } from './userService';
import { API_BASE_URL } from './apiConfig';

function safeParseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function normalizeMedicine(item) {
  const ingredients = safeParseJson(item.ingredients, []);
  const tags = safeParseJson(item.tags, []);
  const fullData = safeParseJson(item.full_data, {});

  return {
    id: item.medicine_id,
    name: item.pill_name,
    ingredient: ingredients[0]?.name || '성분 정보 없음',
    dosage: item.dosage_instruction,
    tags,
    schedule: {
      times: (item.schedule_times || []).map((t) => ({
        id: t.schedule_id,
        hour: t.hour,
        minute: t.minute,
        notificationId: t.notification_id || null,
      })),
      suggestionDismissed: !!item.suggestion_dismissed,
    },
    fullData,
  };
}

async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`서버 오류 (${response.status})`);
  }
  return response.json();
}

export async function getMedicines() {
  const userId = await getUserId();
  const data = await fetchJson(`/api/v1/medicines?userId=${encodeURIComponent(userId)}`);
  return (data.medicines || []).map(normalizeMedicine);
}

export async function addMedicine(newMed) {
  const userId = await getUserId();
  await fetchJson('/api/v1/medicines/pill-identify', {
    method: 'POST',
    body: JSON.stringify({ userId, ...newMed }),
  });
  return getMedicines();
}

export async function deleteMedicine(id) {
  const data = await fetchJson(`/api/v1/medicines/${id}`, { method: 'DELETE' });
  for (const notificationId of data.notification_ids || []) {
    try {
      await cancelNotification(notificationId);
    } catch (e) {
      console.warn('알림 취소 실패:', e);
    }
  }
  return getMedicines();
}

export async function addScheduleTime(medicineId, hour, minute, notificationId) {
  const userId = await getUserId();
  await fetchJson(`/api/v1/medicines/${medicineId}/schedules`, {
    method: 'POST',
    body: JSON.stringify({ userId, hour, minute, notificationId }),
  });
  return getMedicines();
}

export async function removeScheduleTime(medicineId, scheduleId) {
  await fetchJson(`/api/v1/medicines/${medicineId}/schedules/${scheduleId}`, { method: 'DELETE' });
  return getMedicines();
}

export async function dismissSuggestion(medicineId) {
  await fetchJson(`/api/v1/medicines/${medicineId}/suggestion-dismissed`, {
    method: 'PATCH',
    body: JSON.stringify({ dismissed: true }),
  });
  return getMedicines();
}
