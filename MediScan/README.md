# MediScan — 약봉투 분석 & 식사 알림 앱

React Native (Expo) 기반 헬스케어 앱입니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 약봉투 AI 분석 | 카메라/앨범으로 약봉투 촬영 → Claude Vision API로 성분, 복용법, 상호작용 분석 |
| 식사 알림 | 식사 완료 버튼 → 30분 후 약 복용 푸시 알림 (앱 종료 후에도 작동) |
| 기록 관리 | 분석 내역 및 복용 기록 AsyncStorage로 영구 저장 |

## 프로젝트 구조

```
MediScan/
├── App.js                          # 루트 + 탭 네비게이션
├── app.json                        # Expo 설정 (권한, 아이콘 등)
├── package.json
└── src/
    ├── screens/
    │   ├── MedicineScreen.js       # 약봉투 촬영 & AI 분석 화면
    │   ├── MealScreen.js           # 식사 알림 타이머 화면
    │   └── HistoryScreen.js        # 기록 & 통계 화면
    ├── components/
    │   └── UIComponents.js         # 공통 UI (Card, Badge, Button 등)
    ├── services/
    │   ├── claudeApi.js            # Claude Vision API 호출
    │   └── notificationService.js  # 푸시 알림 예약/취소
    ├── hooks/
    │   └── useHistory.js           # AsyncStorage 기록 관리 훅
    └── utils/
        └── theme.js                # 색상, 타이포, 반경 상수
```

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. API 키 설정

`src/services/claudeApi.js` 파일에서 API 키를 설정합니다.

```js
// 직접 입력 (개발용, 보안 주의)
const ANTHROPIC_API_KEY = 'sk-ant-...';
```

**프로덕션 환경에서는 반드시 서버를 통해 API를 호출하세요.**  
클라이언트에 API 키를 노출하면 보안 위험이 있습니다.

권장 방법:
- `expo-constants` + EAS Secrets로 환경 변수 관리
- 백엔드 프록시 서버 (Node.js/Python) 경유

### 3. 실행

```bash
# Expo Go 앱으로 테스트
npx expo start

# iOS 시뮬레이터
npx expo start --ios

# Android 에뮬레이터
npx expo start --android
```

## 사용하는 외부 API

### Claude Vision API
- 엔드포인트: `POST https://api.anthropic.com/v1/messages`
- 모델: `claude-opus-4-5` (이미지 분석 지원)
- 입력: 약봉투 이미지 (base64) + 분석 프롬프트
- 출력: JSON (성분명, 복용법, 상호작용, 주의사항)

### 공공 약품 DB (선택적 연동)
식품의약품안전처 Open API를 추가로 연동하면 더 정확한 정보를 제공할 수 있습니다.
- https://www.data.go.kr → "의약품 개요정보" 검색

## 알림 동작 방식

1. 사용자가 식사 종류 선택 (아침/점심/저녁)
2. "식사 완료" 버튼 클릭
3. `expo-notifications`로 30분 후 알림 예약 → 시스템 레벨 예약이므로 앱 종료 후에도 작동
4. 화면에 카운트다운 타이머 표시
5. 30분 경과 → 푸시 알림 + 앱 내 완료 화면 표시

## 권한 요청

| 권한 | 용도 |
|------|------|
| 카메라 | 약봉투 촬영 |
| 사진 라이브러리 | 앨범에서 사진 선택 |
| 알림 | 식후 약 복용 알림 |

## 빌드 & 배포

```bash
# EAS Build (앱스토어 배포용)
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```
