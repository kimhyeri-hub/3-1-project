const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE'; // .env 파일로 관리 권장
const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * 약봉투 이미지를 base64로 변환 후 Claude Vision API로 분석
 * @param {string} imageUri - 이미지 URI (file:// or content://)
 * @returns {Promise<MedicineInfo>}
 */
export async function analyzeMedicineImage(imageUri) {
  const base64Image = await uriToBase64(imageUri);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `이 약봉투 이미지를 분석해서 다음 정보를 JSON으로만 응답해주세요. 마크다운 없이 순수 JSON만 출력:

{
  "medicineName": "약 이름",
  "ingredients": [
    { "name": "성분명", "amount": "용량", "effect": "주요 효능" }
  ],
  "dosage": {
    "perDose": "1회 복용량",
    "frequency": "하루 복용 횟수",
    "timing": "복용 시기 (예: 식후 30분)",
    "maxDaily": "1일 최대 복용량"
  },
  "interactions": [
    { "substance": "상호작용 물질", "severity": "주의/위험", "description": "상세 설명" }
  ],
  "warnings": ["주의사항1", "주의사항2"],
  "storageInfo": "보관 방법",
  "expiry": "유효기간 (이미지에 있는 경우)"
}

이미지에서 읽을 수 없는 항목은 null로 처리하고, 약봉투가 아닌 경우 { "error": "약봉투를 인식할 수 없습니다" } 반환.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0]?.text || '';

  try {
    return JSON.parse(text.trim());
  } catch {
    throw new Error('분석 결과를 처리할 수 없습니다.');
  }
}

/**
 * 이미지 URI를 base64 문자열로 변환
 */
async function uriToBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
