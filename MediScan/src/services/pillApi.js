import { API_BASE_URL } from './apiConfig';

export async function identifyPill({ name, color, shape, markFront, markBack }) {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (color) params.append('color', color);
  if (shape) params.append('shape', shape);
  if (markFront) params.append('markFront', markFront);
  if (markBack) params.append('markBack', markBack);

  const url = `${API_BASE_URL}/api/v1/pill-identify?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const text = await response.text();

  if (!response.ok) {
    let errMsg = `서버 오류 (${response.status})`;
    try {
      const errData = JSON.parse(text);
      if (errData.error) errMsg = errData.error;
    } catch (e) {
      if (text) errMsg += `\n내용: ${text.substring(0, 100)}`;
    }
    throw new Error(errMsg);
  }

  const data = JSON.parse(text);
  return data.items ?? [];
}

export async function checkPillInteraction({ userId, pillName, ingredient }) {
  const url = `${API_BASE_URL}/api/v1/pill-identify/check-interaction`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ userId, pillName, ingredient }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`서버 오류 (${response.status})`);
  }

  return JSON.parse(text);
}
