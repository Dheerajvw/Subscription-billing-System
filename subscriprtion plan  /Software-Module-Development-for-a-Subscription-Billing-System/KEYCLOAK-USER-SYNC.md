# Keycloak User Synchronization Guide

This guide explains how to set up user synchronization between Keycloak and the application database, ensuring that users created in Keycloak are automatically added to your application's database.

## Overview

The synchronization works in two ways:
1. **Direct Registration**: When users register through the application's `/users/register` endpoint, they are created in both Keycloak and the application database.
2. **Event-based Synchronization**: When users are created directly in Keycloak, a webhook sends events to your application, which then creates the user in the application database.

## Setup Steps

### 1. Enable User Registration in Application

The `/users/register` endpoint is already set up and ready to use. Users can register with this endpoint by sending a POST request with the following JSON structure:

```json
{
  "username": "newuser",
  "email": "user@example.com",
  "firstName": "New",
  "lastName": "User",
  "password": "securepassword",
  "phone": "1234567890"
}
```

### 2. Configure Keycloak Event Listeners

To enable synchronization when users are created directly in Keycloak:

1. Log in to the Keycloak admin console
2. Go to your realm (billing-system)
3. Go to "Events" in the left sidebar
4. Click on the "Config" tab
5. Under "Event Listeners", add a new listener: "webhook-events"
   (You may need to install a webhook extension in Keycloak - see below)

### 3. Install Keycloak Webhook Extension

#### Option 1: Use an Existing Extension

1. Download a Keycloak webhook extension, such as [keycloak-event-listener-webhook](https://github.com/danielpoehle/keycloak-event-listener-webhook)
2. Copy the JAR file to `keycloak-24.0.1/providers/`
3. Restart Keycloak

#### Option 2: Create Your Own Extension

1. Create a Java project with the following dependencies:
   - Keycloak Server SPI
   - Keycloak Server SPI Private
   - Keycloak Services

2. Create a class implementing `org.keycloak.events.EventListenerProvider`:

```java
public class WebhookEventListenerProvider implements EventListenerProvider {
    private final String webhookUrl;
    
    public WebhookEventListenerProvider(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
    
    @Override
    public void onEvent(Event event) {
        // Send event to webhook URL
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(webhookUrl))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(convertEventToJson(event)))
            .build();
        
        try {
            client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            // Log error
        }
    }
    
    @Override
    public void onAdminEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        // Optionally handle admin events
    }
    
    @Override
    public void close() {
        // Cleanup
    }
    
    private String convertEventToJson(Event event) {
        // Convert Event to JSON string
        // ...
    }
}
```

3. Create a provider factory and register the SPI

4. Build the JAR and add it to Keycloak

### 4. Configure Webhook URL

1. In your Keycloak extension configuration, set the webhook URL to point to your application:
   ```
   http://your-application-url:8083/keycloak-events
   ```

2. Make sure your application is accessible from the Keycloak server

### 5. Test User Synchronization

#### Test Direct Registration:

```bash
curl -X POST http://localhost:8083/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "password123",
    "phone": "1234567890"
  }'
```

#### Test Keycloak-to-Application Sync:

1. Create a user directly in Keycloak admin console
2. Check your application logs for synchronization events
3. Verify that the user was created in your application database

## Troubleshooting

### Common Issues:

1. **Webhook not receiving events**: 
   - Check if your application is accessible from Keycloak
   - Verify that the webhook URL is correctly configured
   - Check Keycloak logs for errors when sending events

2. **User created in Keycloak but not in application**:
   - Check application logs for errors during synchronization
   - Verify that the webhook payload contains all necessary user information
   - Make sure the user ID is correctly extracted from the event

3. **Permission errors**:
   - The `/keycloak-events` endpoint is open to allow Keycloak to push events
   - For security, consider adding IP restrictions or authentication to this endpoint

## Manual Synchronization

If automatic synchronization fails, you can manually sync a user using the admin API:

```bash
curl -X POST http://localhost:8083/users/sync/{keycloakUserId} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Replace `{keycloakUserId}` with the actual user ID from Keycloak. 