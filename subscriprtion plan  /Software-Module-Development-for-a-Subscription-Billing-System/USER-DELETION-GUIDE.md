# User Deletion with Keycloak Synchronization

This guide explains how the user deletion process works with Keycloak synchronization in the Subscription Billing System.

## Overview

When a user is deleted from the application database (via the `/customers/{id}` endpoint), they are now automatically deleted from Keycloak as well. This ensures that user data is consistent across both systems.

## How It Works

1. The system first checks if the user exists in the application database
2. If the user exists, it retrieves their email address
3. It then searches for a matching user in Keycloak based on the email address
4. If a matching user is found in Keycloak, that user is deleted
5. Finally, the user is deleted from the application database

## Testing the Synchronized Deletion

### Prerequisites

- A running Keycloak server
- The Subscription Billing System application running
- At least one user created in both systems

### Step 1: Create a Test User

First, let's create a test user that exists in both systems:

```bash
curl -X POST http://localhost:8083/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "deletetest",
    "email": "deletetest@example.com",
    "firstName": "Delete",
    "lastName": "Test",
    "password": "Password123",
    "phone": "1234567890"
  }'
```

Note the `customerId` from the response.

### Step 2: Verify User Exists in Both Systems

1. Check the application database:
```bash
curl -X GET http://localhost:8083/customers/{customerId}
```

2. Check Keycloak:
   - Log in to the Keycloak admin console (http://localhost:8080/admin/)
   - Go to the "Users" section
   - Verify that a user with email "deletetest@example.com" exists

### Step 3: Delete the User

Delete the user using the customer API:

```bash
curl -X DELETE http://localhost:8083/customers/{customerId}
```

You should receive a response like:
```json
{
  "success": true,
  "message": "User deleted successfully from both systems"
}
```

### Step 4: Verify Deletion from Both Systems

1. Check the application database:
```bash
curl -X GET http://localhost:8083/customers/{customerId}
```
This should return a "not found" message.

2. Check Keycloak:
   - Refresh the Users page in the Keycloak admin console
   - Verify that the user with email "deletetest@example.com" no longer exists

## Error Handling

If the deletion process encounters any issues, an error response will be returned:

```json
{
  "success": false,
  "message": "Error message details..."
}
```

Common errors include:
- Customer not found in the application database
- Error connecting to Keycloak
- Insufficient permissions to delete the user

## API Reference

### Delete User from Both Systems

**URL**: `http://localhost:8083/customers/{id}`

**Method**: `DELETE`

**URL Parameters**:
- `id`: The ID of the customer in the application database

**Response**:
- Success:
  ```json
  {
    "success": true,
    "message": "User deleted successfully from both systems"
  }
  ```
- Error:
  ```json
  {
    "success": false,
    "message": "Error message details..."
  }
  ```

## Troubleshooting

1. **User deleted from app but still in Keycloak**:
   - Check if the email addresses match exactly
   - Verify Keycloak connection settings
   - Check application logs for errors

2. **Error connecting to Keycloak**:
   - Verify that Keycloak is running
   - Check Keycloak connection settings in the application
   - Ensure the admin credentials have sufficient permissions

3. **Permission errors**:
   - Ensure the application has proper admin credentials for Keycloak
   - Check that the user performing the deletion has sufficient permissions 