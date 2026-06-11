package com.yakssok.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class DurInteractionServiceTest {

    @Test
    void searchInteractions_와파린() {
        DurInteractionService service = new DurInteractionService(new ObjectMapper());
        List<Map<String, Object>> result = service.searchInteractions("와파린");

        assertNotNull(result);
        System.out.println("[DurInteractionService] 와파린 결과 수: " + result.size());
        result.stream().limit(5).forEach(System.out::println);
    }

    @Test
    void findMatches_매칭확인() {
        DurInteractionService service = new DurInteractionService(new ObjectMapper());
        List<Map<String, Object>> result = service.searchInteractions("와파린");
        List<Map<String, Object>> matched = service.findMatches(result, List.of("아스피린"));

        assertNotNull(matched);
        System.out.println("[DurInteractionService] 와파린-아스피린 매칭 수: " + matched.size());
        matched.stream().limit(5).forEach(System.out::println);
    }
}
