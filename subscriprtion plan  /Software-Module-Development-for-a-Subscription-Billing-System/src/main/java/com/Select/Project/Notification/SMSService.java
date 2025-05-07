package com.Select.Project.Notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.HashMap;
import java.util.Map;

@Service
public class SMSService {
    @Value("${sms.api.key}")
    private String apiKey;
    
    @Value("${sms.api.url}")
    private String apiUrl;
    
    private final RestTemplate restTemplate = new RestTemplate();

    public boolean sendSMS(String to, String message) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, String> body = new HashMap<>();
            body.put("to", to);
            body.put("message", message);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(apiUrl, request, String.class);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
} 