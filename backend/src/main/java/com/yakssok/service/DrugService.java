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
import java.util.HashMap;
import java.util.Map;

@Service
public class DrugService {

    private static final String API_KEY = "7208917cccfaf482c9083726170baa42fb4d2302de944d4399620e1e69d03254";
    private static final String BASE_URL = "http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DrugService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper;
    }

    public Map<String, String> getDrugInfo(String itemName) {
        try {
            String url = BASE_URL
                    + "?serviceKey=" + URLEncoder.encode(API_KEY, StandardCharsets.UTF_8)
                    + "&itemName=" + URLEncoder.encode(itemName, StandardCharsets.UTF_8)
                    + "&type=json";

            HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            JsonNode root = objectMapper.readTree(response.body());
            if (!"00".equals(root.path("header").path("resultCode").asText())) return null;

            JsonNode items = root.path("body").path("items");
            if (!items.isArray() || items.isEmpty()) return null;

            JsonNode item = items.get(0);
            Map<String, String> result = new HashMap<>();
            result.put("efcy", item.path("efcyQesitm").asText(null));   // 효능
            result.put("use", item.path("useMethodQesitm").asText(null)); // 복용법
            result.put("atpn", item.path("atpnQesitm").asText(null));    // 주의사항
            result.put("intrc", item.path("intrcQesitm").asText(null));  // 상호작용
            return result;

        } catch (Exception e) {
            System.err.println("식약처 API 호출 오류: " + e.getMessage());
            return null;
        }
    }
}
