# Keycloak Setup for Subscription Billing System

This guide will help you set up Keycloak to secure your Subscription Billing System.

## 1. Install Keycloak

First, download and install Keycloak:

```bash
# Download Keycloak
wget https://github.com/keycloak/keycloak/releases/download/24.0.1/keycloak-24.0.1.zip
unzip keycloak-24.0.1.zip
cd keycloak-24.0.1
```

## 2. Start Keycloak

Start Keycloak in development mode:

```bash
# Start Keycloak in dev mode
bin/kc.sh start-dev
```

Keycloak will start on http://localhost:8080/

## 3. Initial Setup

1. Access the Keycloak admin console at http://localhost:8080/admin/
2. Create an initial admin user when prompted
3. Log in with the admin credentials you just created

## 4. Create a Realm

1. Hover over the dropdown in the top-left corner (showing "master")
2. Click "Create Realm"
3. Name it "billing-system" and click "Create"

## 5. Create Client

1. In the left sidebar, navigate to "Clients"
2. Click "Create client"
3. Set the Client ID to "billing-api"
4. Enable "Client authentication" 
5. Set "Authentication flow" to "Standard flow" and "Service accounts roles"
6. Click "Next"
7. Set the Root URL to "http://localhost:8083" (your Spring Boot app URL)
8. Set Valid redirect URIs to "http://localhost:8083/*"
9. Set Web origins to "http://localhost:8083"
10. Click "Save"

## 6. Client Settings

1. Go to the "Credentials" tab for the billing-api client
2. Copy the "Client secret" value
3. Update this value in your application.properties file:
   ```
   keycloak.credentials.secret=your-client-secret
   ```

## 7. Create Roles

1. In the left sidebar, navigate to "Clients" > "billing-api" > "Roles"
2. Click "Create role"
3. Create a role named "ADMIN"
4. Click "Save"
5. Repeat to create a role named "USER"

## 8. Create Users

### Create Admin User:

1. In the left sidebar, navigate to "Users"
2. Click "Add user"
3. Fill in the username, email, and other required fields
4. Enable "Email verified"
5. Click "Create"
6. Go to "Credentials" tab
7. Set a password and disable "Temporary" option
8. Go to "Role mappings" tab
9. Under "Client roles", select "billing-api"
10. Add the "ADMIN" role

### Create Regular User:

1. Repeat steps 1-7 above to create a regular user
2. For role mapping, assign the "USER" role instead of "ADMIN"

## 9. Configure Session Management

1. Go to your realm settings
2. Click on the "Sessions" tab
3. Set the following settings:
   - SSO Session Idle: 30 minutes
   - SSO Session Max: 8 hours
   - Client Session Idle: 15 minutes
   - Client Session Max: 8 hours
   - Offline Session Idle: 30 days (if you want to support "remember me" functionality)
   - Access Token Lifespan: 5 minutes
   - Client Login Timeout: 5 minutes

4. Enable "Revoke Refresh Token" to prevent refresh token reuse
5. Click "Save"

### Advanced Session Settings:

1. Navigate to "Authentication" in the left sidebar
2. Click on the "Flows" tab
3. Select "Browser" flow
4. For sensitive operations, you can add additional authentication steps

## 10. Update Your Application

Make sure your application.properties file has these settings:

```properties
# Keycloak Configuration
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/billing-system
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=${spring.security.oauth2.resourceserver.jwt.issuer-uri}/protocol/openid-connect/certs

# Keycloak Admin Configuration
keycloak.auth-server-url=http://localhost:8080
keycloak.realm=billing-system
keycloak.resource=billing-api
keycloak.credentials.secret=your-client-secret-here
keycloak.bearer-only=true
keycloak.ssl-required=external
keycloak.use-resource-role-mappings=true
keycloak.confidential-port=0
```

## 11. Test Your Setup

1. Start your Spring Boot application
2. Try to access a secured endpoint:
   ```
   curl http://localhost:8083/subscriptions/plans
   ```
   This should return a 401 Unauthorized error

3. Get an access token:
   ```
   curl -X POST http://localhost:8080/realms/billing-system/protocol/openid-connect/token \
   -H "Content-Type: application/x-www-form-urlencoded" \
   -d "grant_type=password" \
   -d "client_id=billing-api" \
   -d "client_secret=your-client-secret" \
   -d "username=your-user" \
   -d "password=your-password"
   ```

4. Use the token to access protected resources:
   ```
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:8083/subscriptions/plans
   ```

5. To refresh your token when it expires:
   ```
   curl -X POST http://localhost:8080/realms/billing-system/protocol/openid-connect/token \
   -H "Content-Type: application/x-www-form-urlencoded" \
   -d "grant_type=refresh_token" \
   -d "client_id=billing-api" \
   -d "client_secret=your-client-secret" \
   -d "refresh_token=YOUR_REFRESH_TOKEN"
   ```

6. To logout and invalidate the session:
   ```
   curl -X POST http://localhost:8083/auth/logout \
   -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
   -H "Content-Type: application/x-www-form-urlencoded" \
   -d "refresh_token=YOUR_REFRESH_TOKEN"
   ```

## 12. Session Management in Your Application

The application includes several endpoints for session management:

- `POST /auth/login`: Login and get tokens
- `POST /auth/refresh`: Refresh an expired token
- `POST /auth/logout`: Logout and invalidate session
- `GET /auth/session-info`: Get information about the current session
- `GET /auth/session-expired`: Endpoint redirected to when a session expires

You can use these endpoints to:
- Authenticate users
- Maintain session state
- Monitor active sessions
- Handle session expiration
- Force logout users when needed

## Notes

- Adjust the URLs and ports to match your environment
- For production, make sure to enable SSL and use secure connections
- Consider adding groups for more complex role structures
- Adjust session timeouts based on your security requirements 