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
    private static final String SCHEDULES_TABLE = "sgu-yaksok-1-schedules";
    private static final String USERS_TABLE = "sgu-yaksok-1-users";
    private static final String SCHEDULES_MEDICINE_ID_INDEX = "medicine_id-index";

    private final DynamoDbClient dynamoDbClient;
    private final ObjectMapper objectMapper;

    public DynamoDbService(DynamoDbClient dynamoDbClient, ObjectMapper objectMapper) {
        this.dynamoDbClient = dynamoDbClient;
        this.objectMapper = objectMapper;
    }

    public String saveMedicine(String userId, String pillName, String dosageInstruction,
                               String warningMessage, String s3Key, List<?> ingredients,
                               String fullDataJson, List<?> tags) {
        String medicineId = UUID.randomUUID().toString();
        String ingredientsJson = toJsonOrDefault(ingredients, "[]");
        String tagsJson = toJsonOrDefault(tags, "[]");

        Map<String, AttributeValue> item = buildMedicineItem(medicineId, userId, pillName, dosageInstruction,
                warningMessage, s3Key, ingredientsJson, fullDataJson != null ? fullDataJson : "{}", tagsJson, "ocr");

        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(MEDICINES_TABLE)
                .item(item)
                .build());

        return medicineId;
    }

    public String addPillIdentifyMedicine(String userId, String pillName, String ingredient, String dosage,
                                          List<?> tags, Map<String, Object> fullData) {
        String medicineId = UUID.randomUUID().toString();
        String ingredientsJson = toJsonOrDefault(
                List.of(Map.of("name", ingredient != null ? ingredient : "")), "[]");
        String tagsJson = toJsonOrDefault(tags, "[]");
        String fullDataJson = toJsonOrDefault(fullData, "{}");

        Map<String, AttributeValue> item = buildMedicineItem(medicineId, userId, pillName,
                dosage != null ? dosage : "정보 없음", "정보 없음", "", ingredientsJson, fullDataJson, tagsJson, "pill_identify");

        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(MEDICINES_TABLE)
                .item(item)
                .build());

        return medicineId;
    }

    private Map<String, AttributeValue> buildMedicineItem(String medicineId, String userId, String pillName,
                                                            String dosageInstruction, String warningMessage,
                                                            String s3Key, String ingredientsJson,
                                                            String fullDataJson, String tagsJson, String source) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("medicine_id", AttributeValue.fromS(medicineId));
        item.put("user_id", AttributeValue.fromS(userId != null ? userId : "anonymous"));
        item.put("pill_name", AttributeValue.fromS(pillName));
        item.put("dosage_instruction", AttributeValue.fromS(dosageInstruction));
        item.put("is_safe", AttributeValue.fromBool(true));
        item.put("warning_message", AttributeValue.fromS(warningMessage != null ? warningMessage : "정보 없음"));
        item.put("s3_key", AttributeValue.fromS(s3Key != null ? s3Key : ""));
        item.put("ingredients", AttributeValue.fromS(ingredientsJson));
        item.put("created_at", AttributeValue.fromS(LocalDateTime.now().toString()));
        item.put("source", AttributeValue.fromS(source));
        item.put("tags", AttributeValue.fromS(tagsJson));
        item.put("full_data", AttributeValue.fromS(fullDataJson));
        item.put("suggestion_dismissed", AttributeValue.fromBool(false));
        return item;
    }

    private String toJsonOrDefault(Object value, String fallback) {
        if (value == null) return fallback;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return fallback;
        }
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
                    String medicineId = item.getOrDefault("medicine_id", AttributeValue.fromS("")).s();
                    Map<String, Object> map = new HashMap<>();
                    map.put("medicine_id", medicineId);
                    map.put("pill_name", item.getOrDefault("pill_name", AttributeValue.fromS("")).s());
                    map.put("dosage_instruction", item.getOrDefault("dosage_instruction", AttributeValue.fromS("")).s());
                    map.put("warning_message", item.getOrDefault("warning_message", AttributeValue.fromS("")).s());
                    map.put("ingredients", item.getOrDefault("ingredients", AttributeValue.fromS("[]")).s());
                    map.put("created_at", item.getOrDefault("created_at", AttributeValue.fromS("")).s());
                    map.put("source", item.containsKey("source") ? item.get("source").s() : "ocr");
                    map.put("tags", item.containsKey("tags") ? item.get("tags").s() : "[]");
                    map.put("full_data", item.containsKey("full_data") ? item.get("full_data").s() : "{}");
                    map.put("suggestion_dismissed", item.containsKey("suggestion_dismissed")
                            && Boolean.TRUE.equals(item.get("suggestion_dismissed").bool()));
                    map.put("schedule_times", getSchedulesByMedicineId(medicineId));
                    return map;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getSchedulesByMedicineId(String medicineId) {
        try {
            Map<String, AttributeValue> expressionValues = Map.of(
                    ":mid", AttributeValue.fromS(medicineId)
            );

            List<Map<String, AttributeValue>> items = dynamoDbClient.query(
                    QueryRequest.builder()
                            .tableName(SCHEDULES_TABLE)
                            .indexName(SCHEDULES_MEDICINE_ID_INDEX)
                            .keyConditionExpression("medicine_id = :mid")
                            .expressionAttributeValues(expressionValues)
                            .build()
            ).items();

            return items.stream()
                    .map(item -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("schedule_id", item.getOrDefault("schedule_id", AttributeValue.fromS("")).s());
                        map.put("hour", Integer.parseInt(item.getOrDefault("hour", AttributeValue.fromN("0")).n()));
                        map.put("minute", Integer.parseInt(item.getOrDefault("minute", AttributeValue.fromN("0")).n()));
                        map.put("notification_id", item.containsKey("notification_id") ? item.get("notification_id").s() : "");
                        return map;
                    })
                    .sorted(Comparator.comparingInt(m -> (Integer) m.get("hour") * 60 + (Integer) m.get("minute")))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    public Map<String, Object> addSchedule(String medicineId, String userId, int hour, int minute, String notificationId) {
        String scheduleId = UUID.randomUUID().toString();

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("schedule_id", AttributeValue.fromS(scheduleId));
        item.put("medicine_id", AttributeValue.fromS(medicineId));
        item.put("user_id", AttributeValue.fromS(userId != null ? userId : "anonymous"));
        item.put("hour", AttributeValue.fromN(String.valueOf(hour)));
        item.put("minute", AttributeValue.fromN(String.valueOf(minute)));
        item.put("notification_id", AttributeValue.fromS(notificationId != null ? notificationId : ""));
        item.put("created_at", AttributeValue.fromS(LocalDateTime.now().toString()));

        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(SCHEDULES_TABLE)
                .item(item)
                .build());

        Map<String, Object> result = new HashMap<>();
        result.put("schedule_id", scheduleId);
        result.put("hour", hour);
        result.put("minute", minute);
        result.put("notification_id", notificationId != null ? notificationId : "");
        return result;
    }

    public String deleteSchedule(String scheduleId) {
        Map<String, AttributeValue> key = Map.of("schedule_id", AttributeValue.fromS(scheduleId));

        GetItemResponse response = dynamoDbClient.getItem(
                GetItemRequest.builder().tableName(SCHEDULES_TABLE).key(key).build()
        );

        String notificationId = null;
        if (response.hasItem() && response.item().containsKey("notification_id")) {
            String nid = response.item().get("notification_id").s();
            notificationId = (nid == null || nid.isBlank()) ? null : nid;
        }

        dynamoDbClient.deleteItem(DeleteItemRequest.builder().tableName(SCHEDULES_TABLE).key(key).build());
        return notificationId;
    }

    public List<String> deleteSchedulesByMedicineId(String medicineId) {
        List<Map<String, Object>> schedules = getSchedulesByMedicineId(medicineId);
        List<String> notificationIds = new ArrayList<>();

        for (Map<String, Object> schedule : schedules) {
            String notificationId = (String) schedule.get("notification_id");
            if (notificationId != null && !notificationId.isBlank()) {
                notificationIds.add(notificationId);
            }
            Map<String, AttributeValue> key = Map.of(
                    "schedule_id", AttributeValue.fromS((String) schedule.get("schedule_id")));
            dynamoDbClient.deleteItem(DeleteItemRequest.builder().tableName(SCHEDULES_TABLE).key(key).build());
        }

        return notificationIds;
    }

    public void deleteMedicine(String medicineId) {
        Map<String, AttributeValue> key = Map.of("medicine_id", AttributeValue.fromS(medicineId));
        dynamoDbClient.deleteItem(DeleteItemRequest.builder().tableName(MEDICINES_TABLE).key(key).build());
    }

    public void setSuggestionDismissed(String medicineId, boolean dismissed) {
        Map<String, AttributeValue> key = Map.of("medicine_id", AttributeValue.fromS(medicineId));

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(MEDICINES_TABLE)
                .key(key)
                .updateExpression("SET suggestion_dismissed = :v")
                .expressionAttributeValues(Map.of(":v", AttributeValue.fromBool(dismissed)))
                .build());
    }

    public void touchUser(String userId) {
        try {
            Map<String, AttributeValue> key = Map.of("user_id", AttributeValue.fromS(userId));
            GetItemResponse response = dynamoDbClient.getItem(
                    GetItemRequest.builder().tableName(USERS_TABLE).key(key).build()
            );

            String now = LocalDateTime.now().toString();
            if (response.hasItem()) {
                dynamoDbClient.updateItem(UpdateItemRequest.builder()
                        .tableName(USERS_TABLE)
                        .key(key)
                        .updateExpression("SET last_seen_at = :now")
                        .expressionAttributeValues(Map.of(":now", AttributeValue.fromS(now)))
                        .build());
            } else {
                Map<String, AttributeValue> item = new HashMap<>();
                item.put("user_id", AttributeValue.fromS(userId));
                item.put("created_at", AttributeValue.fromS(now));
                item.put("last_seen_at", AttributeValue.fromS(now));
                dynamoDbClient.putItem(PutItemRequest.builder().tableName(USERS_TABLE).item(item).build());
            }
        } catch (Exception ignored) {}
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
