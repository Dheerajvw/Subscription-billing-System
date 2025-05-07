# Resolving CORS Issues with Subscription API

## The Problem

You encountered the following CORS error when trying to subscribe to a plan:

```
Access to fetch at 'http://localhost:8083/subscriptions/subscribe' from origin 'http://localhost:4200' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution 1: Angular Proxy (Implemented)

We've implemented an Angular proxy solution that routes API requests through the Angular dev server to avoid CORS issues. This is already set up in the project:

1. Created a `proxy.conf.json` file at the project root
2. Updated `package.json` to use this proxy config when starting the dev server
3. Modified the API URLs in services to use relative paths (`/api` instead of `http://localhost:8083`)

To use this solution, simply start the application with:

```
npm start
```

This will run the application with the proxy enabled, avoiding CORS issues.

## Solution 2: Enable CORS on the Backend Server

If the proxy doesn't work or you need to access the backend directly, you need to enable CORS on your Spring Boot backend. Add the following configuration:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:4200")  // Your Angular app URL
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

## Solution 3: Browser Extensions (Temporary Testing Only)

For temporary testing, you can use a browser extension to disable CORS:

- Chrome: [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino)
- Firefox: [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/)

**Warning:** Only use this approach for testing, never in production.

## API Endpoint Format

The correct API endpoint format for subscriptions is:

```
POST http://localhost:8083/subscriptions?customerId=1&planId=1&paymentMethod=CREDIT_CARD
```

Headers:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

Body: Empty (`{}`)

## Debugging CORS Issues

If you're still experiencing CORS issues, check the following:

1. Verify your Spring Boot server is running
2. Check the browser's Network tab for the specific error
3. Ensure the correct endpoints are being used
4. Verify the Authorization header is properly set
5. Make sure cookies are being sent if using withCredentials:true

## Backend CORS Headers

Your backend needs to return these headers for CORS to work properly:

```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
``` 