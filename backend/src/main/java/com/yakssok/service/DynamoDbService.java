package com.yakssok.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DynamoDbService {

    private static final String MEDICINES_TABLE = "sgu-yaksok-1-medicines";
    private static final String CACHE_TABLE = "sgu-yaksok-1-medicine-cache";

    private final DynamoDbClient dynamoDbClient;
    private final ObjectMapper objectMapper;

    public DynamoDbService(DynamoDbClient dynamoDbClient, ObjectMapper objectMapper) {
        this.dynamoDbClient = dynamoDbClient;
        this.objectMapper = objectMapper;
    }

    public String saveMedicine(String userId, String pillName, String dosageInstruction,
                               String warningMessage, String s3Key, List<?> ingredients) {
        String medicineId = UUID.randomUUID().toString();

        String ingredientsJson = "[]";
        try {
            ingredientsJson = objectMapper.writeValueAsString(ingredients != null ? ingredients : List.of());
        } catch (Exception ignored) {}

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("medicine_id", AttributeValue.fromS(medicineId));
        item.put("user_id", AttributeValue.fromS(userId != null ? userId : "anonymous"));
        item.put("pill_name", AttributeValue.fromS(pillName));
        item.put("dosage_instruction", AttributeValue.fromS(dosageInstruction));
        item.put("is_safe", AttributeValue.fromBool(true));
        item.put("warning_message", AttributeValue.fromS(warningMessage != null ? warningMessage : "정보 없음"));
        item.put("s3_key", AttributeValue.fromS(s3Key));
        item.put("ingredients", AttributeValue.fromS(ingredientsJson));
        item.put("created_at", AttributeValue.fromS(LocalDateTime.now().toString()));

        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(MEDICINES_TABLE)
                .item(item)
                .build());

        return medicineId;
    }

    public List<Map<String, Object>> getMedicinesByUserId(String userId) {
        Map<String, AttributeValue> expressionValues = Map.of(
                ":uid", AttributeValue.fromS(userId)
        );

        List<Map<String, AttributeValue>> items = dynamoDbClient.scan(
                ScanRequest.builder()
                        .tableName(MEDICINES_TABLE)
                        .filterExpression("user_id = :uid")
                        .expressionAttributeValues(expressionValues)
                        .build()
        ).items();

        return items.stream()
                .sorted(Comparator.comparing((Map<String, AttributeValue> i) ->
                        i.getOrDefault("created_at", AttributeValue.fromS("")).s()).reversed())
                .map(item -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("medicine_id", item.getOrDefault("medicine_id", AttributeValue.fromS("")).s());
                    map.put("pill_name", item.getOrDefault("pill_name", AttributeValue.fromS("")).s());
                    map.put("dosage_instruction", item.getOrDefault("dosage_instruction", AttributeValue.fromS("")).s());
                    map.put("warning_message", item.getOrDefault("warning_message", AttributeValue.fromS("")).s());
                    map.put("ingredients", item.getOrDefault("ingredients", AttributeValue.fromS("[]")).s());
                    map.put("created_at", item.getOrDefault("created_at", AttributeValue.fromS("")).s());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public String getAnalysisCache(String medicineName) {
        try {
            Map<String, AttributeValue> key = Map.of(
                    "medicine_name", AttributeValue.fromS(medicineName.trim())
            );
            GetItemResponse response = dynamoDbClient.getItem(
                    GetItemRequest.builder().tableName(CACHE_TABLE).key(key).build()
            );
            if (response.hasItem() && response.item().containsKey("analysis_json")) {
                return response.item().get("analysis_json").s();
            }
        } catch (Exception ignored) {}
        return null;
    }

    public void saveAnalysisCache(String medicineName, String analysisJson) {
        try {
            Map<String, AttributeValue> item = new HashMap<>();
            item.put("medicine_name", AttributeValue.fromS(medicineName.trim()));
            item.put("analysis_json", AttributeValue.fromS(analysisJson));
            item.put("cached_at", AttributeValue.fromS(LocalDateTime.now().toString()));
            dynamoDbClient.putItem(PutItemRequest.builder().tableName(CACHE_TABLE).item(item).build());
        } catch (Exception ignored) {}
    }

    public List<Map<String, Object>> getAllMedicines() {
        List<Map<String, AttributeValue>> items = dynamoDbClient
                .scan(ScanRequest.builder().tableName(MEDICINES_TABLE).build())
                .items();

        return items.stream()
                .sorted(Comparator.comparing((Map<String, AttributeValue> i) ->
                        i.getOrDefault("created_at", AttributeValue.fromS("")).s()).reversed())
                .map(item -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("medicine_id", item.getOrDefault("medicine_id", AttributeValue.fromS("")).s());
                    map.put("pill_name", item.getOrDefault("pill_name", AttributeValue.fromS("")).s());
                    map.put("dosage_instruction", item.getOrDefault("dosage_instruction", AttributeValue.fromS("")).s());
                    map.put("warning_message", item.getOrDefault("warning_message", AttributeValue.fromS("")).s());
                    map.put("created_at", item.getOrDefault("created_at", AttributeValue.fromS("")).s());
                    return map;
                })
                .collect(Collectors.toList());
    }
}
