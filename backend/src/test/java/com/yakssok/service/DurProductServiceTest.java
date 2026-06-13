package com.yakssok.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class DurProductServiceTest {

    @Test
    void getDurInfo_타이레놀() {
        DurProductService service = new DurProductService(new ObjectMapper());
        List<Map<String, String>> result = service.getDurInfo("타이레놀");

        assertNotNull(result);
        System.out.println("[DurProductService] 타이레놀 결과 수: " + result.size());
        result.forEach(System.out::println);
    }
}
