package com.yakssok.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 한국의약품안전관리원 병용금기약물 API (odcloud)
 * https://api.odcloud.kr/api/15089525/v1/uddi:3f2efdac-942b-494e-919f-8bdc583f65ea
 */
@Service
public class DurInteractionService {

    private static final String API_KEY = "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904";
    private static final String BASE_URL = "https://api.odcloud.kr/api/15089525/v1/uddi:3f2efdac-942b-494e-919f-8bdc583f65ea";
    private static final String[] SEARCH_FIELDS = {"제품명1", "제품명2", "성분명1", "성분명2"};

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DurInteractionService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * 약 이름(제품명/성분명)으로 병용금기 목록을 조회한다.
     * 제품명1, 제품명2, 성분명1, 성분명2 4개 필드를 모두 검색해 중복 제거 후 반환.
     */
    public List<Map<String, Object>> searchInteractions(String drugName) {
        List<Map<String, Object>> results = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (String field : SEARCH_FIELDS) {
            for (JsonNode item : searchByField(field, drugName)) {
                String key = item.path("제품코드1").asText("") + "|" + item.path("제품코드2").asText("");
                if (seen.add(key)) {
                    results.add(parseItem(item));
                }
            }
        }
        return results;
    }

    /**
     * interactions 중 existingDrugNames에 포함된 약과 매칭되는 항목만 추려낸다 (대소문자 무시 부분일치).
     */
    public List<Map<String, Object>> findMatches(List<Map<String, Object>> interactions, List<String> existingDrugNames) {
        List<Map<String, Object>> matched = new ArrayList<>();
        for (Map<String, Object> item : interactions) {
            String drugA = String.valueOf(item.getOrDefault("drug_a", "")).toLowerCase();
            String ingredientA = String.valueOf(item.getOrDefault("ingredient_a", "")).toLowerCase();
            String drugB = String.valueOf(item.getOrDefault("drug_b", "")).toLowerCase();
            String ingredientB = String.valueOf(item.getOrDefault("ingredient_b", "")).toLowerCase();

            for (String existing : existingDrugNames) {
                if (existing == null || existing.isBlank()) continue;
                String target = existing.toLowerCase();
                if (drugA.contains(target) || ingredientA.contains(target)
                        || drugB.contains(target) || ingredientB.contains(target)) {
                    matched.add(item);
                    break;
                }
            }
        }
        return matched;
    }

    private List<JsonNode> searchByField(String fieldKey, String value) {
        List<JsonNode> items = new ArrayList<>();
        try {
            String url = BASE_URL
                    + "?serviceKey=" + URLEncoder.encode(API_KEY, StandardCharsets.UTF_8)
                    + "&page=1&perPage=50"
                    + "&cond[" + URLEncoder.encode(fieldKey, StandardCharsets.UTF_8) + "%3A%3ALIKE]="
                    + URLEncoder.encode(value, StandardCharsets.UTF_8);

            HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.path("data");
            if (data.isArray()) {
                data.forEach(items::add);
            }
        } catch (Exception e) {
            System.err.println("병용금기 API 호출 오류 (" + fieldKey + "): " + e.getMessage());
        }
        return items;
    }

    private Map<String, Object> parseItem(JsonNode item) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("drug_a", item.path("제품명1").asText(""));
        result.put("ingredient_a", item.path("성분명1").asText(""));
        result.put("company_a", item.path("업체명1").asText(""));
        result.put("drug_b", item.path("제품명2").asText(""));
        result.put("ingredient_b", item.path("성분명2").asText(""));
        result.put("company_b", item.path("업체명2").asText(""));
        result.put("reason", item.path("금기사유").asText("금기사유 정보 없음"));
        result.put("notice_date", item.path("공고일자").asText(""));
        return result;
    }
}
