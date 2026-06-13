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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 식품의약품안전처_의약품 낱알식별 정보 API
 * https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03
 */
@Service
public class PillIdentificationService {

    private static final String API_KEY = "c4c7bba8d62a135a804c844745fbd43b2314fd744e4b2e196a699e988ba93904";
    private static final String BASE_URL = "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PillIdentificationService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper;
    }

    /** 약 이름으로 낱알식별 정보(색상/모양/식별문자/이미지)를 조회한다. */
    public List<Map<String, String>> searchByName(String itemName) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("itemName", itemName);
        return search(params);
    }

    /** 외형(색상/모양/식별문자)으로 낱알식별 정보를 조회한다. */
    public List<Map<String, String>> searchByAppearance(String color, String shape, String markFront, String markBack) {
        Map<String, String> params = new LinkedHashMap<>();
        if (color != null && !color.isBlank()) params.put("colorClass1", color);
        if (shape != null && !shape.isBlank()) params.put("drgeShap", shape);
        if (markFront != null && !markFront.isBlank()) params.put("markFront", markFront);
        if (markBack != null && !markBack.isBlank()) params.put("markBack", markBack);
        return search(params);
    }

    private List<Map<String, String>> search(Map<String, String> extraParams) {
        List<Map<String, String>> result = new ArrayList<>();
        try {
            StringBuilder url = new StringBuilder(BASE_URL)
                    .append("?serviceKey=").append(URLEncoder.encode(API_KEY, StandardCharsets.UTF_8))
                    .append("&pageNo=1&numOfRows=10&type=json");
            for (Map.Entry<String, String> entry : extraParams.entrySet()) {
                url.append("&").append(entry.getKey()).append("=")
                        .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            }

            HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url.toString())).timeout(Duration.ofSeconds(10)).GET().build(),
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
            System.err.println("낱알식별 API 호출 오류: " + e.getMessage());
        }
        return result;
    }

    private Map<String, String> parseItem(JsonNode item) {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("item_name", item.path("ITEM_NAME").asText(""));
        result.put("item_seq", item.path("ITEM_SEQ").asText(""));
        result.put("entp_name", item.path("ENTP_NAME").asText(""));
        result.put("chart", item.path("CHART").asText(""));
        result.put("color1", item.path("COLOR_CLASS1").asText(""));
        result.put("color2", item.path("COLOR_CLASS2").asText(""));
        result.put("shape", item.path("DRUG_SHAPE").asText(""));
        result.put("form", item.path("FORM_CODE_NAME").asText(""));
        result.put("mark_front", item.path("PRINT_FRONT").asText(""));
        result.put("mark_back", item.path("PRINT_BACK").asText(""));
        result.put("img_url", item.path("ITEM_IMAGE").asText(""));
        result.put("class_name", item.path("CLASS_NAME").asText(""));
        result.put("etc_otc_name", item.path("ETC_OTC_NAME").asText(""));
        return result;
    }
}
