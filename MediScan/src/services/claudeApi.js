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

    if (!response.ok) {
      let errMsg = `서버 오류 (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error) errMsg = errData.error;
        if (errData.details) errMsg += '\n상세: ' + errData.details;
      } catch (e) {
        const textData = await response.text();
        if (textData) errMsg += `\n내용: ${textData.substring(0, 100)}`;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data ?? data;

  } catch (error) {
    console.error('OCR 분석 중 에러 발생:', error);
    throw error;
  }
}
