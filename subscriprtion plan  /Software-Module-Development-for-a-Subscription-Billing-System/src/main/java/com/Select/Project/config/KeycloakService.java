package com.Select.Project.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.IDToken;
import org.keycloak.jose.jws.JWSInput;
import org.keycloak.jose.jws.JWSInputException;

import jakarta.annotation.PostConstruct;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class KeycloakService {

    private static final Logger logger = LoggerFactory.getLogger(KeycloakService.class);

    @Value("${keycloak.auth-server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;
    
    @Value("${keycloak.resource}")
    private String clientId;
    
    @Value("${keycloak.credentials.secret}")
    private String clientSecret;
    
    @Value("${keycloak.admin.username}")
    private String adminUsername;
    
    @Value("${keycloak.admin.password}")
    private String adminPassword;
    
    @Value("${keycloak.admin.client-id}")
    private String adminClientId;
    
    @Value("${keycloak.admin.client-secret}")
    private String adminClientSecret;
    
    private Keycloak keycloak;
    
    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing Keycloak admin client");
            logger.info("Server URL: {}", serverUrl);
            logger.info("Realm: {}", realm);
            logger.info("Client ID: {}", clientId);
            
            // First get an admin token using the admin-cli client
            keycloak = KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")  // Use master realm for admin operations
                .clientId(adminClientId)
                .username(adminUsername)
                .password(adminPassword)
                .build();
            
            logger.info("Keycloak admin client initialized successfully");
        } catch (Exception e) {
            logger.error("Failed to initialize Keycloak admin client: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initialize Keycloak admin client", e);
        }
    }
    
    public List<UserRepresentation> findUserByUsername(String username) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        return usersResource.search(username, true);
    }
    
    public void createUser(String username, String email, String firstName, String lastName, String password, boolean isAdmin) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        // Create user representation
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setUsername(username);
        userRepresentation.setEmail(email);
        userRepresentation.setFirstName(firstName);
        userRepresentation.setLastName(lastName);
        userRepresentation.setEnabled(true);
        userRepresentation.setEmailVerified(true);
        
        // Create user
        org.keycloak.admin.client.CreatedResponseUtil.getCreatedId(usersResource.create(userRepresentation));
        
        // Get the created user ID
        String userId = usersResource.search(username).get(0).getId();
        
        // Set password
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        credential.setTemporary(false);
        
        usersResource.get(userId).resetPassword(credential);
        
        // Assign roles based on isAdmin flag
        assignRoles(userId, isAdmin ? List.of("ADMIN") : List.of("USER"));
    }
    
    /**
     * Creates a user in Keycloak and returns the userId
     */
    public String createUserAndGetId(String username, String email, String firstName, String lastName, String password, boolean isAdmin) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        // Create user representation
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setUsername(username);
        userRepresentation.setEmail(email);
        userRepresentation.setFirstName(firstName);
        userRepresentation.setLastName(lastName);
        userRepresentation.setEnabled(true);
        userRepresentation.setEmailVerified(true);
        
        // Create user
        Response response = usersResource.create(userRepresentation);
        String userId = "";
        
        try {
            if (response.getStatus() == 201) {
                userId = org.keycloak.admin.client.CreatedResponseUtil.getCreatedId(response);
                
                // Set password
                CredentialRepresentation credential = new CredentialRepresentation();
                credential.setType(CredentialRepresentation.PASSWORD);
                credential.setValue(password);
                credential.setTemporary(false);
                
                usersResource.get(userId).resetPassword(credential);
                
                // Assign roles based on isAdmin flag
                assignRoles(userId, isAdmin ? List.of("ADMIN") : List.of("USER"));
            } else {
                throw new RuntimeException("Failed to create user in Keycloak. Status: " + response.getStatus());
            }
        } finally {
            response.close();
        }
        
        return userId;
    }
    
    /**
     * Gets user details from Keycloak by userId
     */
    public Map<String, Object> getUserDetails(String userId) {
        RealmResource realmResource = keycloak.realm(realm);
        UserRepresentation user = realmResource.users().get(userId).toRepresentation();
        
        Map<String, Object> details = new HashMap<>();
        details.put("id", user.getId());
        details.put("username", user.getUsername());
        details.put("email", user.getEmail());
        details.put("firstName", user.getFirstName());
        details.put("lastName", user.getLastName());
        details.put("enabled", user.isEnabled());
        details.put("emailVerified", user.isEmailVerified());
        
        // Get roles
        List<String> roles = new ArrayList<>();
        String clientUUID = realmResource.clients().findByClientId(clientId).get(0).getId();
        List<RoleRepresentation> roleRepresentations = realmResource.users().get(userId).roles()
                .clientLevel(clientUUID).listAll();
        
        for (RoleRepresentation role : roleRepresentations) {
            roles.add(role.getName());
        }
        details.put("roles", roles);
        
        return details;
    }
    
    /**
     * Find users in Keycloak by email address
     * @param email Email address to search for
     * @return List of maps containing user details (id, username, email)
     */
    public List<Map<String, String>> findUsersByEmail(String email) {
        RealmResource realmResource = keycloak.realm(realm);
        List<UserRepresentation> users = realmResource.users().search(null, null, null, email, 0, 10);
        
        return users.stream()
            .map(user -> {
                Map<String, String> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("username", user.getUsername());
                userMap.put("email", user.getEmail());
                return userMap;
            })
            .collect(Collectors.toList());
    }
    
    public void assignRoles(String userId, List<String> roleNames) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        // Get client ID
        String cId = realmResource.clients().findByClientId(clientId).get(0).getId();
        
        // Get client roles
        List<RoleRepresentation> clientRoles = new ArrayList<>();
        for (String roleName : roleNames) {
            clientRoles.add(realmResource.clients().get(cId).roles().get(roleName).toRepresentation());
        }
        
        // Assign client roles
        usersResource.get(userId).roles().clientLevel(cId).add(clientRoles);
    }
    
    public void revokeRoles(String userId, List<String> roleNames) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        // Get client ID
        String cId = realmResource.clients().findByClientId(clientId).get(0).getId();
        
        // Get client roles
        List<RoleRepresentation> clientRoles = new ArrayList<>();
        for (String roleName : roleNames) {
            clientRoles.add(realmResource.clients().get(cId).roles().get(roleName).toRepresentation());
        }
        
        // Revoke client roles
        usersResource.get(userId).roles().clientLevel(cId).remove(clientRoles);
    }
    
    public void deleteUser(String userId) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        usersResource.get(userId).remove();
    }
    
    public void logoutUser(String userId) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        // Logout from all sessions
        usersResource.get(userId).logout();
    }
    
    public int getActiveSessionCount(String userId) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();
        
        return usersResource.get(userId).getUserSessions().size();
    }
    
    public void refreshToken(String refreshToken) {
        keycloak.tokenManager().refreshToken();
    }

    public String getToken(String username, String password) {
        logger.info("Attempting to get token for user: {}", username);
        try {
            HttpClient client = HttpClient.newHttpClient();
            String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";
            
            // Create form data with proper encoding
            String formData = String.format(
                "grant_type=password&client_id=%s&client_secret=%s&username=%s&password=%s",
                clientId,
                clientSecret,
                java.net.URLEncoder.encode(username, "UTF-8"),
                java.net.URLEncoder.encode(password, "UTF-8")
            );
            
            logger.info("Sending token request to: {}", tokenUrl);
            logger.info("Using client ID: {}", clientId);
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(formData))
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            logger.info("Token response status: {}", response.statusCode());
            logger.info("Token response body: {}", response.body());
            
            if (response.statusCode() != 200) {
                logger.error("Keycloak token request failed with status: {}", response.statusCode());
                logger.error("Response body: {}", response.body());
                ObjectMapper mapper = new ObjectMapper();
                JsonNode errorResponse = mapper.readTree(response.body());
                String error = errorResponse.get("error").asText();
                String errorDescription = errorResponse.get("error_description").asText();
                
                if ("invalid_grant".equals(error)) {
                    throw new RuntimeException("User is either not registered or has been deleted. Please check your credentials or register a new account.");
                } else {
                    throw new RuntimeException("Failed to get token from Keycloak. Status: " + response.statusCode() + 
                        ", Response: " + response.body());
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode responseJson = mapper.readTree(response.body());
            String token = responseJson.get("access_token").asText();
            
            if (token == null || token.isEmpty()) {
                logger.error("Token is null or empty in response");
                throw new RuntimeException("Token is null or empty in response");
            }
            
            logger.info("Successfully obtained token for user: {}", username);
            return token;
        } catch (Exception e) {
            logger.error("Error getting token for user {}: {}", username, e.getMessage(), e);
            throw new RuntimeException("Failed to get token: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getUserInfo(String token) {
        try {
            // Split the token into its parts
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new RuntimeException("Invalid token format");
            }

            // Decode the payload (second part)
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            Map<String, Object> claims = new com.fasterxml.jackson.databind.ObjectMapper()
                .readValue(payload, Map.class);

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("email", claims.get("email"));
            userInfo.put("username", claims.get("preferred_username"));
            userInfo.put("firstName", claims.get("given_name"));
            userInfo.put("lastName", claims.get("family_name"));
            return userInfo;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get user info: " + e.getMessage(), e);
        }
    }

    public void createUserIfNotExists(String username, String email, String password) {
        try {
            logger.info("Checking if user exists: {}", username);
            RealmResource realmResource = keycloak.realm(realm);
            UsersResource usersResource = realmResource.users();
            
            List<UserRepresentation> existingUsers = usersResource.search(username, true);
            if (!existingUsers.isEmpty()) {
                logger.info("User already exists: {}", username);
                return;
            }
            
            logger.info("Creating new user: {}", username);
            UserRepresentation user = new UserRepresentation();
            user.setUsername(username);
            user.setEmail(email);
            user.setEnabled(true);
            user.setEmailVerified(true);
            
            Response response = usersResource.create(user);
            if (response.getStatus() != 201) {
                throw new RuntimeException("Failed to create user: " + response.getStatusInfo().getReasonPhrase());
            }
            
            String userId = response.getLocation().getPath().replaceAll(".*/([^/]+)$", "$1");
            logger.info("User created with ID: {}", userId);
            
            // Set password
            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(password);
            credential.setTemporary(false);
            
            usersResource.get(userId).resetPassword(credential);
            
            // Assign USER role
            String clientUUID = realmResource.clients().findByClientId(clientId).get(0).getId();
            RoleRepresentation userRole = realmResource.clients().get(clientUUID).roles().get("USER").toRepresentation();
            usersResource.get(userId).roles().clientLevel(clientUUID).add(Collections.singletonList(userRole));
            
            logger.info("User setup completed: {}", username);
        } catch (Exception e) {
            logger.error("Error creating user {}: {}", username, e.getMessage(), e);
            throw new RuntimeException("Failed to create user: " + e.getMessage(), e);
        }
    }

    /**
     * Verifies the connection to the Keycloak server.
     * @return true if the connection is successful, false otherwise
     */
    public boolean verifyConnection() {
        try {
            // Try to get the realm info to verify connection
            keycloak.realm(realm).toRepresentation();
            return true;
        } catch (Exception e) {
            logger.error("Failed to connect to Keycloak server", e);
            return false;
        }
    }
} 