/**
 * "1일 3회", "하루 3~4회" 같은 복용 횟수 텍스트에서 1일 복용 횟수를 추출한다.
 * 범위(3~4회)인 경우 더 큰 값을 사용한다. 매칭 실패 시 null.
 */
export function parseFrequencyCount(frequencyText) {
  if (!frequencyText) return null;
  const match = frequencyText.match(/(\d+)\s*(?:[~\-]\s*(\d+)\s*)?[회번]/);
  if (!match) return null;
  const first = parseInt(match[1], 10);
  const second = match[2] ? parseInt(match[2], 10) : null;
  return second ? Math.max(first, second) : first;
}

/**
 * 1일 복용 횟수에 대한 추천 알림 시간대를 반환한다.
 */
export function suggestTimesForCount(count) {
  if (!count || count < 1) return [];
  if (count === 1) return [{ hour: 8, minute: 0 }];
  if (count === 2) return [{ hour: 8, minute: 0 }, { hour: 19, minute: 0 }];
  if (count === 3) return [{ hour: 8, minute: 0 }, { hour: 13, minute: 0 }, { hour: 19, minute: 0 }];
  return [{ hour: 7, minute: 0 }, { hour: 12, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 0 }];
}
