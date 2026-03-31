import * as Notifications from 'expo-notifications';

/**
 * 식사 후 30분 뒤 약 복용 알림 예약
 * @param {string} mealType - 'breakfast' | 'lunch' | 'dinner'
 * @param {number} delayMinutes - 알림까지 대기 시간 (기본 30분)
 * @returns {Promise<string>} notificationId
 */
export async function scheduleMealNotification(mealType, delayMinutes = 30) {
  const mealNames = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
  };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 약 복용 시간입니다',
      body: `${mealNames[mealType]} 식사 후 ${delayMinutes}분이 지났습니다. 처방약을 복용해주세요.`,
      sound: 'default',
      data: { mealType, delayMinutes },
    },
    trigger: {
      seconds: delayMinutes * 60,
    },
  });

  return notificationId;
}

/**
 * 예약된 알림 취소
 */
export async function cancelNotification(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * 모든 예약 알림 취소
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
