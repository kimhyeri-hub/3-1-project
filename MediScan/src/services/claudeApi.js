const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

// 더미 데이터 (API 키 없을 때 테스트용)
const DUMMY_DATA = {
  medicineName: '타이레놀 500mg',
  ingredient: '아세트아미노펜 500mg',
  effect: '해열, 진통 (두통, 치통, 생리통)',
  ingredients: [
    { name: '아세트아미노펜', amount: '500mg', effect: '해열, 진통' }
  ],
  dosage: {
    perDose: '1정',
    frequency: '1일 3~4회',
    timing: '식후 30분',
    maxDaily: '4g 초과 금지',
  },
  interactions: [
    { substance: '알코올', severity: '주의', description: '간독성 위험이 높아질 수 있어요.' }
  ],
  warnings: [
    '알코올 복용 시 간독성 위험',
    '동일 성분 중복 복용 금지',
  ],
  storageInfo: '실온 보관 (습기 피할 것)',
};

export async function analyzeMedicineImage(imageUri) {
  // API 키가 없으면 더미 데이터 반환
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
    return new Promise((resolve) => {
      setTimeout(() => resolve(DUMMY_DATA), 2000); // 2초 후 더미 데이터 반환
    });
  }

  // API 키가 있으면 실제 분석
  const base64Image = await uriToBase64(imageUri);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    "timing": "복용 시기",
    "maxDaily": "1일 최대 복용량"
  },
  "interactions": [
    { "substance": "상호작용 물질", "severity": "주의/위험", "description": "상세 설명" }
  ],
  "warnings": ["주의사항1", "주의사항2"],
  "storageInfo": "보관 방법"
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`API 오류: ${response.status}`);

  const data = await response.json();
  const text = data.content[0]?.text || '';

  try {
    return JSON.parse(text.trim());
  } catch {
    throw new Error('분석 결과를 처리할 수 없습니다.');
  }
}

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