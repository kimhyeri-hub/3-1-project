import { getUserId } from './userService';
import { API_BASE_URL } from './apiConfig';

const API_URL = `${API_BASE_URL}/api/v1/ocr/analyze`;

export async function analyzeMedicineImage(base64Image) {
  try {
    const userId = await getUserId();

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ image: base64Image, userId }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const text = await response.text();

    if (!response.ok) {
      let errMsg = `서버 오류 (${response.status})`;
      try {
        const errData = JSON.parse(text);
        if (errData.error) errMsg = errData.error;
        if (errData.details) errMsg += '\n상세: ' + errData.details;
      } catch (e) {
        if (text) errMsg += `\n내용: ${text.substring(0, 100)}`;
      }
      throw new Error(errMsg);
    }

    const data = JSON.parse(text);

    if (data.error) {
      throw new Error(data.error);
    }

    // 최상위 필드(interaction_check, government_info, dur_info, official_interaction_check 등)와
    // data.data의 분석 필드(medicineName, ingredients 등)를 모두 합쳐서 반환
    return { ...data, ...(data.data ?? {}) };

  } catch (error) {
    console.error('OCR 분석 중 에러 발생:', error);
    throw error;
  }
}
