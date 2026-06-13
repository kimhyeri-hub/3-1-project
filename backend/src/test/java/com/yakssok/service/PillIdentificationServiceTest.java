package com.yakssok.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class PillIdentificationServiceTest {

    @Test
    void searchByName_타이레놀() {
        PillIdentificationService service = new PillIdentificationService(new ObjectMapper());
        List<Map<String, String>> result = service.searchByName("타이레놀");

        assertNotNull(result);
        System.out.println("[PillIdentificationService] 타이레놀 결과 수: " + result.size());
        result.forEach(System.out::println);
    }

    @Test
    void searchByAppearance_흰색_원형() {
        PillIdentificationService service = new PillIdentificationService(new ObjectMapper());
        List<Map<String, String>> result = service.searchByAppearance("하양", "원형", null, null);

        assertNotNull(result);
        System.out.println("[PillIdentificationService] 하양/원형 결과 수: " + result.size());
        result.stream().limit(3).forEach(System.out::println);
    }
}
