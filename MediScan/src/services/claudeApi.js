import { getUserId } from './userService';

const API_URL = 'https://j77prte6ibmlvzdow3z5sumiai0wzgxh.lambda-url.ap-northeast-2.on.aws/api/v1/ocr/analyze';

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

    return data.data ?? data;

  } catch (error) {
    console.error('OCR 분석 중 에러 발생:', error);
    throw error;
  }
}
