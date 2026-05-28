const API_URL = 'https://87q4ymlpsk.execute-api.ap-northeast-2.amazonaws.com/default/api/v1/ocr/analyze';

export async function analyzeMedicineImage(imageUri) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  // ★ 중요: 서버가 보내준 데이터(JSON)를 받습니다.
  // 서버 내부에서 팀장님이 작성하신 그 JSON 구조대로 데이터를 만들어서 보내줄 거예요.
  const data = await response.json();

  // 이미 서버(백엔드)에서 JSON.parse를 해서 객체로 보내줄 것이므로 
  // 프론트에서는 바로 에러 체크만 하면 됩니다.
  if (data.error) {
    throw new Error(data.error); // "약봉투를 인식할 수 없습니다" 처리
  }

  return data; // medicineName, ingredients 등이 담긴 객체 반환
}

// base64 변환 함수는 서버 설정에 따라 필요 없을 수 있으나 일단 유지합니다.
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