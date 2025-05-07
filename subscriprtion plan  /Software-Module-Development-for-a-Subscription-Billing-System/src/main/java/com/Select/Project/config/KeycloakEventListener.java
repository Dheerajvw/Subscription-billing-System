package com.Select.Project.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * This class creates an endpoint that can be used as a webhook by Keycloak
 * when user events occur (like user creation, update, or deletion).
 * 
 * To use this, you need to configure a webhook in Keycloak that points to
 * this endpoint: http://your-app-url/keycloak-events
 */
@Component
@RestController
@RequestMapping("/keycloak-events")
public class KeycloakEventListener {

    @Autowired
    private UserRegistrationService userRegistrationService;
    
    /**
     * Endpoint that receives webhook events from Keycloak
     */
    @PostMapping
    public ResponseEntity<?> handleKeycloakEvent(@RequestBody Map<String, Object> eventData, 
                                              HttpServletRequest request) {
        try {
            // Get event type
            String eventType = (String) eventData.get("type");
            
            // Get user details
            @SuppressWarnings("unchecked")
            Map<String, Object> details = (Map<String, Object>) eventData.get("details");
            
            if (eventType == null || details == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid event data"
                ));
            }
            
            // Handle different event types
            switch (eventType) {
                case "REGISTER":
                case "CREATE_USER":
                case "UPDATE_PROFILE":
                    // Sync user to our database
                    String userId = (String) eventData.get("userId");
                    if (userId != null) {
                        userRegistrationService.syncUserFromKeycloak(userId);
                        return ResponseEntity.ok(Map.of(
                            "message", "User synchronized successfully"
                        ));
                    }
                    break;
                    
                default:
                    // Ignore other event types
                    return ResponseEntity.ok(Map.of(
                        "message", "Event ignored: " + eventType
                    ));
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Event processed"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to process event",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Creates a WebClient bean for making HTTP requests to Keycloak
     */
    @Configuration
    public static class WebClientConfig {
        @Bean
        public WebClient webClient() {
            return WebClient.builder()
                .build();
        }
    }
} 