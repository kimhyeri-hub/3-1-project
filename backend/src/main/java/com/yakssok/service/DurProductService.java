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
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 식품의약품안전처_의약품안전사용서비스(DUR)품목정보 API
 * https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03
 */
@Service
public class DurProductService {

    private static final String API_KEY = "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904";
    private static final String BASE_URL = "https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DurProductService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * 약 이름으로 DUR 품목정보(병용금기/연령금기/임부금기 등 DUR 유형 및 금기내용)를 조회한다.
     */
    public List<Map<String, String>> getDurInfo(String itemName) {
        List<Map<String, String>> result = new ArrayList<>();
        try {
            String url = BASE_URL
                    + "?serviceKey=" + URLEncoder.encode(API_KEY, StandardCharsets.UTF_8)
                    + "&pageNo=1&numOfRows=20&type=json"
                    + "&itemName=" + URLEncoder.encode(itemName, StandardCharsets.UTF_8);

            HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode items = root.path("body").path("items");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    result.add(parseItem(item));
                }
            }
        } catch (Exception e) {
            System.err.println("DUR 품목정보 API 호출 오류: " + e.getMessage());
        }
        return result;
    }

    private Map<String, String> parseItem(JsonNode item) {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("item_name", item.path("ITEM_NAME").asText(""));
        result.put("item_seq", item.path("ITEM_SEQ").asText(""));
        result.put("entp_name", item.path("ENTP_NAME").asText(""));

        String typeName = findFieldTrimmed(item, "TYPE_NAME");
        result.put("type_name", typeName);
        result.put("type_code", item.path("TYPE_CODE").asText(""));

        String prohbtContent = item.path("PROHBT_CONTENT").asText("");
        if (prohbtContent.isBlank() && !typeName.isBlank()) {
            prohbtContent = typeName + " 관련 주의가 필요한 약물입니다. 복용 전 약사·의사와 상담하세요.";
        }
        result.put("prohbt_content", prohbtContent);
        result.put("notification_date", item.path("CHANGE_DATE").asText(""));
        return result;
    }

    /** 일부 필드명에 공백이 포함되어 있는 API 응답을 위해 trim 비교로 값을 찾는다. */
    private String findFieldTrimmed(JsonNode item, String fieldName) {
        Iterator<String> names = item.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            if (name.trim().equals(fieldName)) {
                return item.path(name).asText("").trim();
            }
        }
        return "";
    }
}
