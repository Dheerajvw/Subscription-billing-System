# Subscription API Test Guide

This guide helps troubleshoot issues with the subscription API endpoint.

## Problem Summary

The subscription API endpoint was changed from:
- Old (INCORRECT): `/api/customers/{customerId}/subscriptions`
- New (CORRECT): `/api/subscriptions?customerId={customerId}&planId={planId}&paymentMethod={paymentMethod}`

## Testing Tools

We've added a diagnostic tool to help identify and fix API endpoint issues:

### Test Page
1. Navigate to `/subscription-test` in the application
2. The tool lets you test both the proxy API and direct backend connections
3. You can manually enter your customer ID, plan ID, and other details
4. Check browser console for detailed debug information

### Debug Logging
Enhanced logging has been added to the subscription service that will:
- Log the exact URL being used
- Provide detailed error information
- Show CORS-specific debugging information
- Attempt fallback connections when possible

## How to Fix Common Issues

### CORS Issues
If you see "No 'Access-Control-Allow-Origin' header" errors:
- Ensure the backend allows requests from the frontend origin
- Add proper CORS headers to the backend server:
  ```
  Access-Control-Allow-Origin: http://localhost:4200
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Allow-Credentials: true
  ```

### 404 Errors
- Check if the URL format matches the new API endpoint pattern
- Ensure the API base URL is correct in your environment
- Verify the customer ID and plan ID are valid

### Authentication Issues
- Check that your token is valid and not expired
- Use the test tool to verify the token is being properly included in requests
- Look for 401 errors in the console

## URL Format to Use

```
${API_URL}/subscriptions?customerId=${customerId}&planId=${planId}&paymentMethod=${paymentMethod}
```

## For Developers

The fix was implemented by:
1. Updating the `createSubscription` method in `subscription.service.ts`
2. Adding enhanced logging and error handling
3. Creating a test tool at `/subscription-test` for diagnostics 