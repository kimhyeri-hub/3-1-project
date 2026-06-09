package com.yakssok.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.List;
import java.util.Map;

@Service
public class BedrockService {

    private final BedrockRuntimeClient bedrockClient;
    private final ObjectMapper objectMapper;

    @Value("${aws.bedrock.model-id:anthropic.claude-opus-4-7-20250514-v1:0}")
    private String modelId;

    public BedrockService(BedrockRuntimeClient bedrockClient, ObjectMapper objectMapper) {
        this.bedrockClient = bedrockClient;
        this.objectMapper = objectMapper;
    }

    public String analyzeMedicineText(String rawText) {
        String prompt = """
                당신은 복약 지도 전문 AI입니다. 모든 설명은 의학 지식이 없는 일반인(중학생 수준)도 이해할 수 있는 쉬운 말로 작성해주세요.
                다음은 약 봉투나 처방전에서 추출된 텍스트입니다:
                "%s"

                이 내용을 바탕으로 반드시 아래의 JSON 형식으로만 응답해주세요.
                이미지에서 읽을 수 없는 항목은 null로 처리하고, 약봉투가 아닌 경우 {"error": "약봉투를 인식할 수 없습니다"}를 반환하세요.
                전문 용어(예: 헬리코박터 파이로리, 평활근, 궤양, 항히스타민 등)는 반드시 누구나 아는 쉬운 말로 바꿔주세요.

                {
                  "medicineName": "약 이름",
                  "simpleDescription": "이 약이 무엇인지 중학생도 이해할 수 있는 쉬운 한 줄 설명 (예: 위에 사는 나쁜 균을 없애서 위궤양을 치료하는 약이에요)",
                  "ingredients": [{ "name": "성분명", "amount": "용량", "effect": "쉬운 말로 쓴 주요 효능 (예: 위장 근육을 편안하게 풀어줘요)" }],
                  "dosage": {
                    "perDose": "1회 복용량",
                    "frequency": "하루 복용 횟수",
                    "timing": "복용 시기 (예: 식후 30분)",
                    "maxDaily": "1일 최대 복용량"
                  },
                  "interactions": [{ "substance": "상호작용 물질", "severity": "주의/위험", "description": "쉬운 말로 쓴 상세 설명" }],
                  "warnings": ["쉬운 말로 쓴 주의사항1", "쉬운 말로 쓴 주의사항2"],
                  "storageInfo": "보관 방법",
                  "expiry": "유효기간"
                }
                """.formatted(rawText);

        return callBedrock(prompt);
    }

    public String checkInteractions(String newMedicineName, List<?> newIngredients,
                                     List<Map<String, Object>> existingMedicines) {
        StringBuilder existingMedsText = new StringBuilder();
        for (Map<String, Object> med : existingMedicines) {
            existingMedsText.append("- ").append(med.get("pill_name"))
                    .append(" (성분: ").append(med.get("ingredients")).append(")\n");
        }

        String prompt = """
                당신은 복약 상호작용 전문 AI입니다.

                현재 복용 중인 약 목록:
                %s

                새로 추가할 약: %s
                새 약의 성분: %s

                위 복용 중인 약들과 새 약 사이의 성분 충돌 또는 상호작용을 분석해주세요.
                반드시 아래 JSON 형식으로만 응답해주세요:

                {
                  "hasConflict": true 또는 false,
                  "conflicts": [
                    {
                      "existingMedicine": "기존 약 이름",
                      "conflictingIngredients": ["충돌 성분1", "충돌 성분2"],
                      "severity": "주의 또는 위험",
                      "description": "충돌 설명"
                    }
                  ],
                  "summary": "전체 요약 한 줄"
                }
                """.formatted(existingMedsText.toString(), newMedicineName, newIngredients.toString());

        return callBedrock(prompt);
    }

    private String callBedrock(String prompt) {
        try {
            String requestJson = objectMapper.writeValueAsString(Map.of(
                    "anthropic_version", "bedrock-2023-05-31",
                    "max_tokens", 2048,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
            ));

            InvokeModelResponse response = bedrockClient.invokeModel(
                    InvokeModelRequest.builder()
                            .modelId(modelId)
                            .body(SdkBytes.fromUtf8String(requestJson))
                            .build()
            );

            Map<?, ?> result = objectMapper.readValue(response.body().asUtf8String(), Map.class);
            List<?> content = (List<?>) result.get("content");
            String text = (String) ((Map<?, ?>) content.get(0)).get("text");
            // 마크다운 코드펜스 제거
            text = text.strip();
            if (text.startsWith("```")) {
                text = text.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").strip();
            }
            return text;

        } catch (Exception e) {
            return "{\"error\": \"분석 실패\", \"details\": \"" + e.getMessage() + "\"}";
        }
    }
}
