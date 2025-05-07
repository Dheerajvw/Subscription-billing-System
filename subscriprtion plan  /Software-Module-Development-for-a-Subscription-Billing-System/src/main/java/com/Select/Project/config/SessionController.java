package com.Select.Project.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class SessionController {

    @Autowired
    private KeycloakService keycloakService;
    
    @Autowired
    private SecurityUtil securityUtil;
    
    @Autowired
    private TokenService tokenService;
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, @RequestParam String password) {
        try {
            Map<String, Object> tokenResponse = tokenService.getToken(username, password);
            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication failed: " + e.getMessage()));
        }
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestParam String refreshToken) {
        try {
            Map<String, Object> tokenResponse = tokenService.refreshToken(refreshToken);
            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Token refresh failed: " + e.getMessage()));
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, @RequestParam(required = false) String refreshToken) {
        try {
            String userId = securityUtil.getCurrentUserId();
            if (userId != null) {
                // Invalidate session in Keycloak
                keycloakService.logoutUser(userId);
            }
            
            // Invalidate local session
            request.getSession().invalidate();
            
            // If a refresh token is provided, also perform token revocation
            if (refreshToken != null && !refreshToken.isEmpty()) {
                tokenService.logout(refreshToken);
            }
            
            return ResponseEntity.ok().body(Map.of("message", "Successfully logged out"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/session-info")
    public ResponseEntity<?> getSessionInfo() {
        try {
            String userId = securityUtil.getCurrentUserId();
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            int activeSessionCount = keycloakService.getActiveSessionCount(userId);
            
            return ResponseEntity.ok().body(Map.of(
                "userId", userId,
                "username", securityUtil.getCurrentUsername(),
                "roles", securityUtil.getCurrentUserRoles(),
                "isAdmin", securityUtil.isAdmin(),
                "activeSessions", activeSessionCount
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/session-expired")
    public ResponseEntity<?> sessionExpired() {
        return ResponseEntity.status(401).body(Map.of("error", "Your session has expired. Please log in again."));
    }
} 