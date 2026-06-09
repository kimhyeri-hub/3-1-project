package com.yakssok.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yakssok.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class MedicineController {

    private final OcrService ocrService;
    private final BedrockService bedrockService;
    private final DrugService drugService;
    private final DynamoDbService dynamoDbService;
    private final S3Service s3Service;
    private final ObjectMapper objectMapper;

    public MedicineController(OcrService ocrService, BedrockService bedrockService,
                               DrugService drugService, DynamoDbService dynamoDbService,
                               S3Service s3Service, ObjectMapper objectMapper) {
        this.ocrService = ocrService;
        this.bedrockService = bedrockService;
        this.drugService = drugService;
        this.dynamoDbService = dynamoDbService;
        this.s3Service = s3Service;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "running", "project", "Yaksok API"));
    }

    @GetMapping("/api/medicines")
    public ResponseEntity<List<Map<String, Object>>> getMedicines() {
        return ResponseEntity.ok(dynamoDbService.getAllMedicines());
    }

    @PostMapping("/api/v1/ocr/analyze")
    public ResponseEntity<Map<String, Object>> analyzeMedicine(
            @RequestBody Map<String, String> body) {
        try {
            String base64Image = body.get("image");
            if (base64Image == null || base64Image.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지 데이터가 없습니다."));
            }

            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            // S3 업로드
            String filename = UUID.randomUUID() + ".jpg";
            String s3Key = s3Service.upload(imageBytes, filename, "image/jpeg");

            // Cloud Vision OCR
            String rawText = ocrService.extractText(imageBytes);
            if (rawText.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지에서 텍스트를 추출할 수 없습니다."));
            }

            // Bedrock Claude 분석
            String analysisJson = bedrockService.analyzeMedicineText(rawText);
            @SuppressWarnings("unchecked")
            Map<String, Object> analysisData = objectMapper.readValue(analysisJson, Map.class);

            if (analysisData.containsKey("error")) {
                return ResponseEntity.badRequest().body(analysisData);
            }

            String pillName = (String) analysisData.getOrDefault("medicineName", "알 수 없는 약");

            @SuppressWarnings("unchecked")
            Map<String, Object> dosageMap = (Map<String, Object>) analysisData.get("dosage");
            String dosageInstruction = dosageMap != null
                    ? dosageMap.getOrDefault("timing", "정보 없음") + " (" + dosageMap.getOrDefault("frequency", "회") + ")"
                    : "정보 없음";

            // 식약처 API
            Map<String, String> drugInfo = drugService.getDrugInfo(pillName);

            String warningMessage = (drugInfo != null && drugInfo.get("atpn") != null)
                    ? drugInfo.get("atpn") : "정보 없음";

            // DynamoDB 저장
            String medicineId = dynamoDbService.saveMedicine(pillName, dosageInstruction, warningMessage, s3Key);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "등록 완료!");
            response.put("medicine_id", medicineId);
            response.put("data", analysisData);
            response.put("government_info", drugInfo);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
