# 약쏘옥(Yaksok) AWS 마이그레이션 세팅 가이드

## 전환 아키텍처 요약

| 현재 (로컬) | AWS 전환 대상 |
|---|---|
| Google Cloud Vision API (OCR) | **AWS Textract** |
| OpenAI GPT-4o (AI 분석) | **AWS Bedrock (Claude)** |
| MySQL (로컬) | **AWS DynamoDB** |
| FastAPI 로컬 실행 | **AWS Lambda + API Gateway** |
| 이미지 로컬 임시 저장 | **AWS S3** |
| 별도 없음 | **AWS EC2** (개발/운영 서버) |

```
[React Native App]
        │
        ▼
[API Gateway]
        │
        ▼
[Lambda: OCR 분석]
    ├── 이미지 → S3 저장
    ├── S3 → Textract (OCR 텍스트 추출)
    ├── 텍스트 → Bedrock Claude (복약 정보 분석)
    └── 분석 결과 → DynamoDB 저장
```

---

## 0. 사전 준비: AWS CloudShell 및 IAM Role 확인

### 0-1. AWS CloudShell 접속 (CLI 설치 불필요)

AWS CloudShell은 AWS 콘솔에 dl내장된 브라우저 기반 터미널입니다.
AWS CLI, Python, git이 모두 사전 설치되어 있습니다.

#### 접속 방법
1. AWS 콘솔 상단 네비게이션 바에서 터미널 아이콘(`>_`) 클릭
2. 또는 상단 검색창에 `CloudShell` 검색 후 접속
3. 리전이 **아시아 태평양(서울) ap-northeast-2** 인지 확인 후 진입

#### CloudShell 특징
- 로컬 PC에 AWS CLI 설치 불필요
- 1GB 영구 스토리지 제공 (홈 디렉토리 `/home/cloudshell-user`)
- 콘솔 로그인 계정(IAM 유저)의 자격증명을 기본으로 사용
- **IAM 유저에 권한이 없으면 SafeRole-sgu-iam 역할을 직접 Assume 해야 함** (0-2 참고)

### 0-2. SafeRole-sgu-iam 역할 Assume (필수)

CloudShell은 기본적으로 로그인한 **IAM 유저** 권한으로 실행됩니다.
회사 계정은 IAM 유저에 직접 권한이 없고 **SafeRole-sgu-iam 역할을 통해서만** 서비스 접근이 허용됩니다.
모든 명령 실행 전에 아래 절차로 역할을 Assume 해야 합니다.

#### 방법 A — CloudShell에서 역할 Assume (세션당 1회)

```bash
# 1. 역할 Assume (계정 ID: 443370697536)
aws sts assume-role \
  --role-arn "arn:aws:iam::443370697536:role/SafeRole-sgu-iam" \
  --role-session-name "yaksok-session"
```

출력된 `Credentials` 블록의 값을 복사해 아래에 붙여넣기:
```bash
# 2. 임시 자격증명을 환경변수로 설정
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="IQoJ..."
```

```bash
# 3. 역할 전환 확인 — Arn에 SafeRole-sgu-iam 이 보여야 함
aws sts get-caller-identity
```

> **주의**: CloudShell 세션이 끊기면 환경변수가 초기화되므로 재접속 시 다시 Assume 해야 합니다.

#### 방법 B — 콘솔에서 역할 전환 후 CloudShell 접속

1. 콘솔 우측 상단 계정명 클릭 → **역할 전환(Switch Role)**
2. 계정: `443370697556` / 역할: `SafeRole-sgu-iam` 입력 후 전환
3. CloudShell 재접속 → 자동으로 역할 자격증명 적용

#### IAM Role 정보 조회
```bash
# Role에 연결된 정책 목록 확인
aws iam list-attached-role-policies --role-name SafeRole-sgu-iam

# Role의 인라인 정책 목록 확인
aws iam list-role-policies --role-name SafeRole-sgu-iam
```

#### Role 권한 테스트
```bash
# S3 접근 가능 여부 테스트
aws s3 ls

# DynamoDB 접근 가능 여부 테스트
aws dynamodb list-tables --region ap-northeast-2

# Bedrock 접근 가능 여부 테스트
aws bedrock list-foundation-models --region us-east-1
```

---

## 1. S3 버킷 생성 (이미지 저장소)

약 봉투 이미지를 Textract로 분석하기 전에 S3에 업로드합니다.

```bash
# 버킷 생성 (리전: 서울)
aws s3api create-bucket \
  --bucket sgu-yaksok-1-s3 \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2 \
  --region ap-northeast-2

# 퍼블릭 접근 차단 (보안 설정 - 이미지는 Lambda를 통해서만 접근)
aws s3api put-public-access-block \
  --bucket sgu-yaksok-1-s3 \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region ap-northeast-2

# 버킷 생성 확인
aws s3 ls
```

### S3 버킷 정책 (Lambda에서만 접근 허용)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::443370697536:role/SafeRole-sgu-pj"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sgu-yaksok-1-s3/*"
    }
  ]
}
```

```bash
# 위 JSON을 s3-bucket-policy.json 파일로 저장 후 적용
aws s3api put-bucket-policy \
  --bucket sgu-yaksok-1-s3 \
  --policy file://s3-bucket-policy.json```

---

## 2. DynamoDB 테이블 생성 (데이터베이스)

기존 MySQL 테이블(users, medicines, schedules)을 DynamoDB로 전환합니다.

### 2-1. users 테이블
```bash
aws dynamodb create-table \
  --table-name sgu-yaksok-1-users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2```

### 2-2. medicines 테이블
```bash
aws dynamodb create-table \
  --table-name sgu-yaksok-1-medicines \
  --attribute-definitions \
    AttributeName=medicine_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=medicine_id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "user_id-index",
      "KeySchema": [{"AttributeName":"user_id","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2```

DynamoDB 저장 항목 구조 (medicines):
```json
{
  "medicine_id": "uuid-string",
  "user_id": "user-uuid",
  "pill_name": "타이레놀",
  "dosage_instruction": "식후 30분 (하루 3회)",
  "is_safe": true,
  "warning_message": "주의사항 텍스트",
  "ingredients": [...],
  "interactions": [...],
  "storage_info": "실온 보관",
  "created_at": "2026-05-26T10:00:00"
}
```

### 2-3. schedules 테이블
```bash
aws dynamodb create-table \
  --table-name sgu-yaksok-1-schedules \
  --attribute-definitions \
    AttributeName=schedule_id,AttributeType=S \
    AttributeName=medicine_id,AttributeType=S \
  --key-schema \
    AttributeName=schedule_id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "medicine_id-index",
      "KeySchema": [{"AttributeName":"medicine_id","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2```

### 테이블 생성 확인
```bash
aws dynamodb list-tables --region ap-northeast-2```

---

## 3. AWS Textract 설정 (OCR)

Textract는 별도 인프라 프로비저닝 없이 IAM 권한만 있으면 바로 사용 가능합니다.

### 3-1. Textract 접근 권한 확인
```bash
# 테스트: S3에 올린 샘플 이미지로 Textract 호출 가능 여부 확인
aws textract detect-document-text \
  --document '{"S3Object":{"Bucket":"sgu-yaksok-1-s3","Name":"test.jpg"}}' \
  --region ap-northeast-2```

### 3-2. Lambda에서 사용할 Textract 코드 (Python)

기존 `ocr_service.py` (Google Vision) → AWS Textract 전환:
```python
# services/ocr_service.py (AWS Textract 버전)
import boto3

textract_client = boto3.client('textract', region_name='ap-northeast-2')

def extract_text_from_image(image_bytes: bytes) -> str:
    """이미지 바이트를 받아 Textract로 텍스트를 추출합니다."""
    response = textract_client.detect_document_text(
        Document={'Bytes': image_bytes}
    )
    lines = [
        block['Text']
        for block in response['Blocks']
        if block['BlockType'] == 'LINE'
    ]
    return '\n'.join(lines)


def extract_text_from_s3(bucket: str, key: str) -> str:
    """S3에 업로드된 이미지에서 텍스트를 추출합니다."""
    response = textract_client.detect_document_text(
        Document={'S3Object': {'Bucket': bucket, 'Name': key}}
    )
    lines = [
        block['Text']
        for block in response['Blocks']
        if block['BlockType'] == 'LINE'
    ]
    return '\n'.join(lines)
```

---

## 4. AWS Bedrock 설정 (AI 분석 - Claude)

### 4-1. Bedrock 모델 접근 활성화 (콘솔에서 수행)

> **리전 주의**: Claude Opus 4.7은 **미국 동부(버지니아 북부) us-east-1** 또는 크로스 리전 추론 프로파일을 통해 사용합니다.
> Bedrock 콘솔 진입 전 리전을 `us-east-1`로 변경하세요.

1. AWS 콘솔 리전을 **미국 동부(버지니아 북부) us-east-1** 로 변경
2. **Amazon Bedrock** 서비스 이동
3. 왼쪽 메뉴 → **Model access** 클릭
4. **Manage model access** 버튼 클릭
5. 다음 모델 체크 후 **Request model access**:
   - `Anthropic / Claude Opus 4.7` (선택)
6. 승인까지 수 분 ~ 수 시간 소요

### 4-2. 접근 가능한 모델 목록 확인 (CloudShell)
```bash
# us-east-1에서 Anthropic 모델 목록 확인 (Claude Opus 4.7 modelId 확인용)
aws bedrock list-foundation-models \
  --by-provider anthropic \
  --region us-east-1 \
  --query 'modelSummaries[*].[modelId,modelName]' \
  --output table
```

### 4-3. Lambda에서 사용할 Bedrock 코드 (Python)

기존 `gpt_service.py` (OpenAI) → AWS Bedrock 전환:
```python
# services/bedrock_service.py (Bedrock Claude 버전)
import boto3
import json

bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')

# Claude Opus 4.7 모델 ID (4-2 단계 CLI 명령으로 실제 modelId 확인 후 기입)
MODEL_ID = "anthropic.claude-opus-4-7-20250514-v1:0"

def analyze_medicine_text(raw_text: str) -> str:
    """OCR로 추출된 텍스트를 Bedrock Claude에게 보내 정형 JSON 데이터로 변환합니다."""
    if not raw_text.strip():
        return json.dumps({"error": "추출된 텍스트가 없습니다."})

    prompt = f"""
    당신은 복약 지도 전문 AI입니다.
    다음은 약 봉투나 처방전에서 추출된 텍스트입니다:
    "{raw_text}"

    이 내용을 바탕으로 반드시 아래의 JSON 형식으로만 응답해주세요.
    이미지에서 읽을 수 없는 항목은 null로 처리하고, 약봉투가 아닌 경우
    {{"error": "약봉투를 인식할 수 없습니다"}}를 반환하세요.

    {{
      "medicineName": "약 이름",
      "ingredients": [{{"name": "성분명", "amount": "용량", "effect": "주요 효능"}}],
      "dosage": {{
        "perDose": "1회 복용량",
        "frequency": "하루 복용 횟수",
        "timing": "복용 시기 (예: 식후 30분)",
        "maxDaily": "1일 최대 복용량"
      }},
      "interactions": [{{"substance": "상호작용 물질", "severity": "주의/위험", "description": "상세 설명"}}],
      "warnings": ["주의사항1", "주의사항2"],
      "storageInfo": "보관 방법",
      "expiry": "유효기간"
    }}
    """

    response = bedrock_client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "messages": [{"role": "user", "content": prompt}]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

---

## 5. AWS Lambda 함수 배포 (API 서버)

### 5-1. Lambda용 의존성 패키지 준비
```bash
# 프로젝트 루트에서 실행
mkdir lambda_package
pip install boto3 fastapi mangum python-multipart -t lambda_package/

# 기존 app 코드 복사
cp -r backend/app/* lambda_package/
```

### 5-2. Lambda 핸들러 파일 생성
```python
# lambda_handler.py
from mangum import Mangum
from app.main import app

# Mangum이 FastAPI를 Lambda에서 실행 가능하게 래핑
handler = Mangum(app, lifespan="off")
```

### 5-3. 배포 패키지(ZIP) 생성
```powershell
# PowerShell
cd lambda_package
Compress-Archive -Path * -DestinationPath ../yaksok-lambda.zip -Force
cd ..
```

### 5-4. Lambda 함수 생성
```bash
# 함수 생성
aws lambda create-function \
  --function-name sgu-yaksok-1-api \
  --runtime python3.12 \
  --role arn:aws:iam::<계정ID>:role/SafeRole-sgu-iam \
  --handler lambda_handler.handler \
  --zip-file fileb://yaksok-lambda.zip \
  --timeout 30 \
  --memory-size 512 \
  --region ap-northeast-2 \
  --environment Variables='{
    "DYNAMODB_REGION":"ap-northeast-2",
    "S3_BUCKET":"sgu-yaksok-1-s3",
    "BEDROCK_REGION":"us-east-1",
    "BEDROCK_MODEL_ID":"anthropic.claude-opus-4-7-20250514-v1:0"
  }'
# 코드 변경 후 업데이트
aws lambda update-function-code \
  --function-name sgu-yaksok-1-api \
  --zip-file fileb://yaksok-lambda.zip \
  --region ap-northeast-2```

### 5-5. API Gateway 연결
```bash
# HTTP API 생성 (Lambda 자동 통합)
aws apigatewayv2 create-api \
  --name sgu-yaksok-1-http-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-northeast-2:<계정ID>:function:sgu-yaksok-1-api \
  --region ap-northeast-2
# 생성된 API 엔드포인트 URL 확인
aws apigatewayv2 get-apis \
  --region ap-northeast-2 \
  --query 'Items[?Name==`sgu-yaksok-1-http-api`].ApiEndpoint' \
  --output text
```

### 5-6. Lambda 함수 테스트
```bash
aws lambda invoke \
  --function-name sgu-yaksok-1-api \
  --payload '{"httpMethod":"GET","path":"/","headers":{}}' \
  --cli-binary-format raw-in-base64-out \
  --region ap-northeast-2 \
  response.json

cat response.json
```

---

## 6. AWS EC2 설정 (개발/운영 서버)

EC2는 Lambda로 대체하기 어려운 장기 실행 작업이나 FastAPI 직접 구동에 사용합니다.

### 6-1. EC2 인스턴스 생성
```bash
# 보안 그룹 생성
aws ec2 create-security-group \
  --group-name sgu-yaksok-1-sg \
  --description "Security group for Yaksok API server" \
  --region ap-northeast-2
# 인바운드 규칙 추가 (SSH, FastAPI 포트)
aws ec2 authorize-security-group-ingress \
  --group-name sgu-yaksok-1-sg \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 \
  --region ap-northeast-2
aws ec2 authorize-security-group-ingress \
  --group-name sgu-yaksok-1-sg \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0 \
  --region ap-northeast-2
# 최신 Amazon Linux 2023 AMI ID 조회 (서울 리전)
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*" "Name=architecture,Values=x86_64" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' \
  --output text \
  --region ap-northeast-2
# EC2 인스턴스 생성 (t3.micro - 프리티어)
aws ec2 run-instances \
  --image-id <위에서 조회한 AMI-ID> \
  --instance-type t3.micro \
  --key-name yakssook-key \
  --security-groups sgu-yaksok-1-sg \
  --iam-instance-profile Name=SafeRole-sgu-iam \
  --region ap-northeast-2 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=sgu-yaksok-1-api-server}]'
```

### 6-2. EC2 접속 및 환경 설정
```bash
# 인스턴스 퍼블릭 IP 확인
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=sgu-yaksok-1-api-server" \
  --query 'Reservations[*].Instances[*].PublicIpAddress' \
  --output text \
  --region ap-northeast-2
# SSH 접속 (프로젝트 내 yakssook-key.pem 사용)
ssh -i deploy/yakssook-key.pem ec2-user@<퍼블릭IP>
```

EC2 서버 내 환경 설정:
```bash
# EC2 내부에서 실행
sudo dnf update -y
sudo dnf install python3.12 python3.12-pip git -y

# 코드 배포
git clone https://github.com/kimhyeri-hub/3-1-project.git
cd 3-1-project/backend

pip3.12 install -r requirements.txt

# FastAPI 실행 (백그라운드)
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```

---

## 7. IAM 역할 권한 체크리스트

`SafeRole-sgu-iam`에 아래 권한이 포함되어 있어야 합니다. 팀 관리자에게 확인 요청하세요.

| 서비스 | 필요한 권한 |
|---|---|
| S3 | `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:CreateBucket` |
| DynamoDB | `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:Scan`, `dynamodb:UpdateItem`, `dynamodb:CreateTable` |
| Textract | `textract:DetectDocumentText`, `textract:AnalyzeDocument` |
| Bedrock | `bedrock:InvokeModel`, `bedrock:ListFoundationModels` |
| Lambda | `lambda:CreateFunction`, `lambda:UpdateFunctionCode`, `lambda:InvokeFunction` |
| API Gateway | `apigateway:*` |
| EC2 | `ec2:RunInstances`, `ec2:DescribeInstances`, `ec2:CreateSecurityGroup` |

### 권한 확인 (IAM 시뮬레이터)
```bash
aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::<계정ID>:role/SafeRole-sgu-iam" \
  --action-names "s3:PutObject" "dynamodb:PutItem" "textract:DetectDocumentText" "bedrock:InvokeModel" \
  --resource-arns "*"```

---

## 8. 환경변수 관리 (AWS Systems Manager)

Lambda 환경변수 대신 Parameter Store를 사용하면 값을 중앙에서 관리할 수 있습니다.

```bash
# 설정값 저장
aws ssm put-parameter \
  --name "/sgu-yaksok-1/s3-bucket" \
  --value "sgu-yaksok-1-s3" \
  --type String \
  --region ap-northeast-2
aws ssm put-parameter \
  --name "/sgu-yaksok-1/bedrock-model-id" \
  --value "anthropic.claude-opus-4-7-20250514-v1:0" \
  --type String \
  --region ap-northeast-2

aws ssm put-parameter \
  --name "/sgu-yaksok-1/bedrock-region" \
  --value "us-east-1" \
  --type String \
  --region ap-northeast-2
# 저장된 값 확인
aws ssm get-parameters-by-path \
  --path "/sgu-yaksok-1" \
  --region ap-northeast-2```

---

## 9. 비용 예상 (참고)

| 서비스 | 무료 티어 | 초과 시 단가 |
|---|---|---|
| S3 | 5GB 저장, PUT/GET 각 20,000회/월 | $0.023/GB |
| DynamoDB | 25GB 저장, 읽기/쓰기 각 25 WCU/RCU | 온디맨드 과금 |
| Textract | 첫 3개월 1,000페이지/월 | $1.50/1,000페이지 |
| Bedrock (Claude Opus 4.7) | 없음 | 입력 $15/1M 토큰, 출력 $75/1M 토큰 |
| Lambda | 100만 건/월, 400,000 GB-초/월 | $0.20/100만 건 |
| EC2 (t3.micro) | 750시간/월 (첫 12개월) | $0.013/시간 |

---

## 10. 빠른 시작 체크리스트

- [ ] AWS 콘솔 상단 `>_` 아이콘으로 **CloudShell** 접속 확인
- [ ] `aws sts assume-role`로 SafeRole-sgu-iam Assume 후 환경변수 설정
- [ ] `aws sts get-caller-identity`로 SafeRole-sgu-iam 역할 전환 확인
- [ ] S3 버킷 `sgu-yaksok-1-s3` 생성
- [ ] DynamoDB 테이블 3개 생성 (sgu-yaksok-1-users, sgu-yaksok-1-medicines, sgu-yaksok-1-schedules)
- [ ] Bedrock 콘솔 (us-east-1) 에서 **Claude Opus 4.7** 접근 활성화 신청 (수동)
- [ ] `ocr_service.py` → Textract 버전으로 교체
- [ ] `gpt_service.py` → `bedrock_service.py`로 교체
- [ ] Lambda 함수 생성 및 API Gateway 연결
- [ ] EC2 인스턴스 생성 (필요 시)
- [ ] 앱의 API 엔드포인트를 API Gateway URL로 변경
