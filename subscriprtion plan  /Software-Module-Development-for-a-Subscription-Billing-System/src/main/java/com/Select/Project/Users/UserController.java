package com.Select.Project.Users;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import com.Select.Project.config.KeycloakService;
import com.Select.Project.config.UserRegistrationService;
import com.Select.Project.Users.UserLoginService;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/users")
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRegistrationService userRegistrationService;
    
    @Autowired
    private KeycloakService keycloakService;
    
    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private UserLoginService userLoginService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam(required = false) String username,
                                 @RequestParam(required = false) String email,
                                 @RequestParam String password,
                                 @RequestHeader("User-Agent") String deviceId,
                                 HttpServletRequest request) {
        String ipAddress = request.getRemoteAddr();
        // If behind a proxy, try to get the real IP
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            ipAddress = forwardedFor.split(",")[0].trim();
        }
        
        logger.info("Login attempt for username: {} or email: {} from IP: {}", username, email, ipAddress);
        try {
            if ((username == null || username.isEmpty()) && (email == null || email.isEmpty())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid request",
                    "message", "Either username or email is required"
                ));
            }

            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid request",
                    "message", "Password is required"
                ));
            }

            logger.info("Attempting to get token from Keycloak");
            String token;
            String loginType;
            if (email != null && !email.isEmpty()) {
                loginType = "email";
                List<Map<String, String>> users = keycloakService.findUsersByEmail(email);
                if (users.isEmpty()) {
                    logger.error("No user found with email: {}", email);
                    return ResponseEntity.status(401).body(Map.of(
                        "error", "Authentication failed",
                        "message", "Invalid credentials"
                    ));
                }
                String foundUsername = users.get(0).get("username");
                logger.info("Found username {} for email {}", foundUsername, email);
                token = keycloakService.getToken(foundUsername, password);
            } else {
                loginType = "username";
                token = keycloakService.getToken(username, password);
            }

            if (token == null || token.isEmpty()) {
                logger.error("Failed to get token from Keycloak");
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication failed",
                    "message", "User is either not registered or has been deleted. Please check your credentials or register a new account."
                ));
            }
            logger.info("Keycloak authentication successful");
            
            logger.info("Getting user info from token");
            Map<String, Object> userInfo = keycloakService.getUserInfo(token);
            if (userInfo == null || userInfo.isEmpty()) {
                logger.error("Failed to get user info from token");
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication failed",
                    "message", "Could not retrieve user information"
                ));
            }
            
            String userEmail = (String) userInfo.get("email");
            if (userEmail == null || userEmail.isEmpty()) {
                logger.error("Email not found in user info");
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication failed",
                    "message", "User email not found"
                ));
            }
            
            logger.info("Looking up customer with email: {}", userEmail);
            List<Customers> customers = customerRepository.findByCustomerEmail(userEmail);
            Customers customer;
            
            if (customers.isEmpty()) {
                logger.info("Creating new customer");
                customer = new Customers();
                String name = (String) userInfo.get("name");
                customer.setCustomerName(name != null ? name : (String) userInfo.get("username"));
                customer.setCustomerEmail(userEmail);
                customer.setCustomerPhone("");
                customer.setSubscriptionStatus("INACTIVE");
                customer = customerRepository.save(customer);
            } else {
                customer = customers.get(0);
            }
            
            // Check if user can login based on their subscription plan
            if (!userLoginService.canUserLogin((long) customer.getCustomerId(), deviceId, ipAddress, loginType)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Login limit reached",
                    "message", "You have reached the maximum number of concurrent logins for your subscription plan"
                ));
            }

            // Add the new session
            userLoginService.addSession((long) customer.getCustomerId(), deviceId, ipAddress, loginType);
            
            logger.info("Customer found/created with ID: {}", customer.getCustomerId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("customerId", customer.getCustomerId());
            response.put("username", userInfo.get("username"));
            response.put("email", userEmail);
            response.put("name", customer.getCustomerName());
            response.put("subscriptionStatus", customer.getSubscriptionStatus());
            
            // Extract roles from token
            @SuppressWarnings("unchecked")
            Map<String, Object> resourceAccess = (Map<String, Object>) userInfo.get("resource_access");
            if (resourceAccess != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> billingApi = (Map<String, Object>) resourceAccess.get("billing-api");
                if (billingApi != null) {
                    @SuppressWarnings("unchecked")
                    List<String> roles = (List<String>) billingApi.get("roles");
                    response.put("roles", roles);
                }
            }
            
            response.put("activeSessions", userLoginService.getActiveSessionCount((long) customer.getCustomerId()));
            
            // Add subscription info for new users
            if (customer.getSubscription_id() == null || customer.getSubscription_id().isEmpty()) {
                response.put("subscriptionInfo", "No active subscription. Please subscribe to access all features.");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Login failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Authentication failed",
                "message", e.getMessage(),
                "details", e.getCause() != null ? e.getCause().getMessage() : "No additional details"
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token,
                                  @RequestHeader("User-Agent") String deviceId) {
        try {
            Map<String, Object> userInfo = keycloakService.getUserInfo(token.replace("Bearer ", ""));
            String userEmail = (String) userInfo.get("email");
            
            List<Customers> customers = customerRepository.findByCustomerEmail(userEmail);
            if (!customers.isEmpty()) {
                Customers customer = customers.get(0);
                userLoginService.removeSession((long) customer.getCustomerId(), deviceId);
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Logout successful"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Logout failed",
                "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> registrationData) {
        logger.info("Inside the registerUser method: {}", registrationData);
        try {
            String username = (String) registrationData.get("username");
            String email = (String) registrationData.get("email");
            String firstName = (String) registrationData.get("firstName");
            String lastName = (String) registrationData.get("lastName");
            String password = (String) registrationData.get("password");
            
            // Check for both phone and customerPhone fields
            String phone = (String) registrationData.get("phone");
            if (phone == null) {
                // Try alternative field name
                phone = (String) registrationData.get("customerPhone");
            }
            
            // Log the extracted phone value for debugging
            logger.info("Extracted phone number: {}", phone);
            
            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Registration failed",
                    "message", "Username is required"
                ));
            }
            
            logger.info("Registering user with username: {}", username);
            boolean isAdmin = false;
            
            Map<String, Object> result = userRegistrationService.registerUser(username, email, 
                firstName, lastName, password, phone, isAdmin);
                
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error in registerUser method: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Registration failed",
                "message", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/register-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> registerAdmin(@RequestBody Map<String, Object> registrationData) {
        try {
            String username = (String) registrationData.get("username");
            String email = (String) registrationData.get("email");
            String firstName = (String) registrationData.get("firstName");
            String lastName = (String) registrationData.get("lastName");
            String password = (String) registrationData.get("password");
            String phone = (String) registrationData.get("phone");
            
            // Register as an admin
            boolean isAdmin = true;
            
            Map<String, Object> result = userRegistrationService.registerUser(username, email, 
                firstName, lastName, password, phone, isAdmin);
                
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Admin registration failed",
                "message", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/sync/{keycloakUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> syncUserFromKeycloak(@PathVariable String keycloakUserId) {
        try {
            userRegistrationService.syncUserFromKeycloak(keycloakUserId);
            return ResponseEntity.ok(Map.of(
                "message", "User synchronized successfully from Keycloak"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Synchronization failed",
                "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/username-by-email")
    public ResponseEntity<?> getUsernameByEmail(@RequestParam String email) {
        try {
            List<Map<String, String>> users = keycloakService.findUsersByEmail(email);
            if (users.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of(
                "username", users.get(0).get("username"),
                "email", email
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to retrieve username",
                "message", e.getMessage()
            ));
        }
    }
} 