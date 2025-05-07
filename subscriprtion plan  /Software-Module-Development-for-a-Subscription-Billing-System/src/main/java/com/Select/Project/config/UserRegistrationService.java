package com.Select.Project.config;

import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import com.Select.Project.Notification.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserRegistrationService {
    private static final Logger logger = LoggerFactory.getLogger(UserRegistrationService.class);

    @Autowired
    private KeycloakService keycloakService;
    
    @Autowired
    private CustomerRespositry customerRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Registers a new user in both Keycloak and the application database
     * in a single transaction
     */
    @Transactional
    public Map<String, Object> registerUser(String username, String email, String firstName, 
                                         String lastName, String password, String phone, 
                                         boolean isAdmin) {
        logger.info("Starting user registration for: {}", email);
        try {
            // Step 1: Create user in Keycloak
            String userId = keycloakService.createUserAndGetId(username, email, firstName, 
                                                            lastName, password, isAdmin);
            logger.info("User created in Keycloak with ID: {}", userId);
            
            // Step 2: Create user in application database
            Customers customer = new Customers();
            customer.setCustomerName(firstName + " " + lastName);
            customer.setCustomerEmail(email);
            
            // Make sure phone is properly set - fix for the issue
            if (phone != null && !phone.isEmpty()) {
                logger.info("Setting customer phone: {}", phone);
                customer.setCustomerPhone(phone);
            } else {
                // Set a default empty value to avoid null
                logger.warn("Phone number is null or empty, setting empty string");
                customer.setCustomerPhone("");
            }
            
            customer.setSubscriptionStatus("INACTIVE");
            
            customer = customerRepository.save(customer);
            logger.info("User created in application database with ID: {}", customer.getCustomerId());
            
            // Step 3: Send welcome email
            String welcomeMessage = String.format(
                "Welcome to our service!\n\n" +
                "Your account has been successfully created.\n" +
                "Username: %s\n" +
                "Password: %s\n\n" +
                "Please keep these credentials safe and do not share them with anyone.",
                username, password
            );
            
            notificationService.createNotification(
                Long.valueOf(customer.getCustomerId()),
                "WELCOME",
                welcomeMessage
            );
            logger.info("Welcome email sent to: {}", email);
            
            // Step 4: Return user details
            return Map.of(
                "message", "User registered successfully in both systems",
                "userId", userId,
                "customerId", customer.getCustomerId(),
                "username", username,
                "email", email
            );
            
        } catch (Exception e) {
            logger.error("Registration failed for user {}: {}", email, e.getMessage());
            throw new RuntimeException("Failed to register user: " + e.getMessage(), e);
        }
    }
    
    /**
     * Syncs an existing Keycloak user to the application database
     */
    public void syncUserFromKeycloak(String keycloakUserId) {
        try {
            // Get user details from Keycloak
            Map<String, Object> userDetails = keycloakService.getUserDetails(keycloakUserId);
            
            // Check if user already exists in local database
            List<Customers> existingUsers = customerRepository.findByCustomerEmail((String) userDetails.get("email"));
            
            if (existingUsers.isEmpty()) {
                // Create new user in local database
                Customers customer = new Customers();
                customer.setCustomerName(userDetails.get("firstName") + " " + userDetails.get("lastName"));
                customer.setCustomerEmail((String) userDetails.get("email"));
                // Set default/empty values for required fields
                customer.setCustomerPhone("");
                customer.setSubscriptionStatus("INACTIVE");
                
              
                customerRepository.save(customer);
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to sync user from Keycloak: " + e.getMessage(), e);
        }
    }
    
    /**
     * Deletes a user from both Keycloak and the application database
     * @param customerId The ID of the customer in the application database
     * @return A map with the status of the operation
     */
    @Transactional
    public Map<String, Object> deleteUser(Integer customerId) {
        logger.info("Inside the deleteUser method: {}", customerId);
        try {
            // Get customer from database
            Customers customer = customerRepository.getCustomerById(customerId);
            if (customer == null) {
                return Map.of(
                    "success", false,
                    "message", "Customer not found with ID: " + customerId
                );
            }
            
            // Find user in Keycloak by email
            String email = customer.getCustomerEmail();
            List<Map<String, String>> keycloakUsers = keycloakService.findUsersByEmail(email);
            
            // Delete user from Keycloak if found
            if (!keycloakUsers.isEmpty()) {
                String keycloakUserId = keycloakUsers.get(0).get("id");
                keycloakService.deleteUser(keycloakUserId);
            }
            
            // Delete user from application database
            customerRepository.deleteById(customerId);
            
            return Map.of(
                "success", true,
                "message", "User deleted successfully from both systems"
            );
            
        } catch (Exception e) {
            logger.error("Error in deleteUser method: {}", e.getMessage());
            throw new RuntimeException("Failed to delete user: " + e.getMessage(), e);
        }
    }
    
    /**
     * Deletes a user from both Keycloak and the application database
     * @param customerId The ID of the customer in the application database (as Long)
     * @return A map with the status of the operation
     */
    @Transactional
    public Map<String, Object> deleteUser(Long customerId) {
        logger.info("Inside the deleteUser method: {}", customerId);
        return deleteUser(customerId.intValue());
    }
} 