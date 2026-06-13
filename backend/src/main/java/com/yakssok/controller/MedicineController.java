package com.yakssok.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yakssok.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
public class MedicineController {

    private final OcrService ocrService;
    private final BedrockService bedrockService;
    private final DrugService drugService;
    private final DynamoDbService dynamoDbService;
    private final S3Service s3Service;
    private final ObjectMapper objectMapper;
    private final DurInteractionService durInteractionService;
    private final DurProductService durProductService;
    private final PillIdentificationService pillIdentificationService;

    public MedicineController(OcrService ocrService, BedrockService bedrockService,
                               DrugService drugService, DynamoDbService dynamoDbService,
                               S3Service s3Service, ObjectMapper objectMapper,
                               DurInteractionService durInteractionService,
                               DurProductService durProductService,
                               PillIdentificationService pillIdentificationService) {
        this.ocrService = ocrService;
        this.bedrockService = bedrockService;
        this.drugService = drugService;
        this.dynamoDbService = dynamoDbService;
        this.s3Service = s3Service;
        this.objectMapper = objectMapper;
        this.durInteractionService = durInteractionService;
        this.durProductService = durProductService;
        this.pillIdentificationService = pillIdentificationService;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "running", "project", "Yaksok API"));
    }

    @GetMapping("/api/medicines")
    public ResponseEntity<List<Map<String, Object>>> getMedicines() {
        return ResponseEntity.ok(dynamoDbService.getAllMedicines());
    }

    @GetMapping("/api/v1/pill-identify")
    public ResponseEntity<Map<String, Object>> identifyPill(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String shape,
            @RequestParam(required = false) String markFront,
            @RequestParam(required = false) String markBack) {
        List<Map<String, String>> items = (name != null && !name.isBlank())
                ? pillIdentificationService.searchByName(name)
                : pillIdentificationService.searchByAppearance(color, shape, markFront, markBack);
        return ResponseEntity.ok(Map.of("items", items));
    }

    @PostMapping("/api/v1/ocr/analyze")
    public ResponseEntity<Map<String, Object>> analyzeMedicine(
            @RequestBody Map<String, Object> body) {
        try {
            String base64Image = (String) body.get("image");
            String userId = (String) body.getOrDefault("userId", "anonymous");
            @SuppressWarnings("unchecked")
            List<Map<String, String>> myMedicines = (List<Map<String, String>>) body.get("myMedicines");

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

            // 약 이름 추출 → 캐시 확인
            Map<String, Object> analysisData = null;
            String cachedName = bedrockService.extractMedicineName(rawText);
            if (cachedName != null) {
                String cached = dynamoDbService.getAnalysisCache(cachedName);
                if (cached != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> cachedData = objectMapper.readValue(cached, Map.class);
                    analysisData = cachedData;
                }
            }

            // 캐시 미스 → Bedrock 전체 분석
            if (analysisData == null) {
                String analysisJson = bedrockService.analyzeMedicineText(rawText);
                @SuppressWarnings("unchecked")
                Map<String, Object> freshData = objectMapper.readValue(analysisJson, Map.class);
                analysisData = freshData;
                // 캐시 저장
                String nameForCache = (String) analysisData.getOrDefault("medicineName", cachedName);
                if (nameForCache != null && !analysisData.containsKey("error")) {
                    dynamoDbService.saveAnalysisCache(nameForCache, analysisJson);
                }
            }

            if (analysisData.containsKey("error")) {
                return ResponseEntity.badRequest().body(analysisData);
            }

            String pillName = (String) analysisData.getOrDefault("medicineName", "알 수 없는 약");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> ingredients = (List<Map<String, Object>>) analysisData.get("ingredients");
            @SuppressWarnings("unchecked")
            Map<String, Object> dosageMap = (Map<String, Object>) analysisData.get("dosage");
            String dosageInstruction = dosageMap != null
                    ? dosageMap.getOrDefault("timing", "정보 없음") + " (" + dosageMap.getOrDefault("frequency", "회") + ")"
                    : "정보 없음";

            // 식약처 API
            Map<String, String> drugInfo = drugService.getDrugInfo(pillName);
            String warningMessage = (drugInfo != null && drugInfo.get("atpn") != null)
                    ? drugInfo.get("atpn") : "정보 없음";

            // DUR 품목정보 (병용금기/연령금기/임부금기 등)
            List<Map<String, String>> durInfo = durProductService.getDurInfo(pillName);

            // 기존 복용 약(DynamoDB + 프론트에서 보낸 "내 약" 목록) 조회 → 충돌 검사
            Map<String, Object> checks = runInteractionChecks(userId, pillName, ingredients, myMedicines);

            // DynamoDB 저장
            String medicineId = dynamoDbService.saveMedicine(
                    userId, pillName, dosageInstruction, warningMessage, s3Key, ingredients);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "등록 완료!");
            response.put("medicine_id", medicineId);
            response.put("data", analysisData);
            response.put("government_info", drugInfo);
            response.put("dur_info", durInfo);
            if (checks.containsKey("interaction_check")) {
                response.put("interaction_check", checks.get("interaction_check"));
            }
            if (checks.containsKey("official_interaction_check")) {
                response.put("official_interaction_check", checks.get("official_interaction_check"));
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/v1/pill-identify/check-interaction")
    public ResponseEntity<Map<String, Object>> checkPillInteraction(@RequestBody Map<String, Object> body) {
        String userId = (String) body.getOrDefault("userId", "anonymous");
        String pillName = (String) body.get("pillName");
        String ingredient = (String) body.getOrDefault("ingredient", "");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> myMedicines = (List<Map<String, String>>) body.get("myMedicines");

        if (pillName == null || pillName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "약 이름이 필요합니다."));
        }

        List<String> ingredients = ingredient.isBlank() ? List.of() : List.of(ingredient);
        return ResponseEntity.ok(runInteractionChecks(userId, pillName, ingredients, myMedicines));
    }

    /**
     * 새 약(pillName)과 사용자의 기존 복용 약(DynamoDB 저장 약 + 프론트에서 보낸 "내 약" 목록)을 비교해
     * 식약처 공식 병용금기 / Bedrock 기반 상호작용 검사 결과를 반환한다.
     */
    private Map<String, Object> runInteractionChecks(
            String userId, String pillName, List<?> ingredients, List<Map<String, String>> myMedicines) {

        List<Map<String, Object>> existingMedicines = new ArrayList<>(dynamoDbService.getMedicinesByUserId(userId));
        Set<String> seenNames = existingMedicines.stream()
                .map(m -> String.valueOf(m.get("pill_name")).trim().toLowerCase())
                .collect(Collectors.toCollection(HashSet::new));

        if (myMedicines != null) {
            for (Map<String, String> med : myMedicines) {
                String name = med.get("name");
                if (name == null || name.isBlank()) continue;
                if (seenNames.add(name.trim().toLowerCase())) {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("pill_name", name);
                    entry.put("ingredients", med.getOrDefault("ingredient", ""));
                    existingMedicines.add(entry);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        if (existingMedicines.isEmpty()) {
            return result;
        }

        // 식약처 공식 병용금기 조회
        List<String> existingNames = existingMedicines.stream()
                .map(m -> String.valueOf(m.get("pill_name")))
                .collect(Collectors.toList());
        List<Map<String, Object>> rawInteractions = durInteractionService.searchInteractions(pillName);
        List<Map<String, Object>> matched = durInteractionService.findMatches(rawInteractions, existingNames);
        Map<String, Object> officialResult = new HashMap<>();
        officialResult.put("is_prohibited", !matched.isEmpty());
        officialResult.put("matched_interactions", matched);
        result.put("official_interaction_check", officialResult);

        // Bedrock 기반 상호작용 검사
        if (ingredients != null && !ingredients.isEmpty()) {
            String interactionJson = bedrockService.checkInteractions(pillName, ingredients, existingMedicines);
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(interactionJson, Map.class);
                result.put("interaction_check", parsed);
            } catch (Exception ignored) {}
        }

        return result;
    }
}
