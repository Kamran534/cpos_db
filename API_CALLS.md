# API Testing Guide - Swagger UI

Complete guide for testing all API endpoints using Swagger UI.

## Table of Contents

- [Accessing Swagger UI](#accessing-swagger-ui)
- [Testing Authentication APIs](#testing-authentication-apis)
- [Complete Workflow Examples](#complete-workflow-examples)
- [Common API Calls](#common-api-calls)
- [Troubleshooting](#troubleshooting)

---

## Accessing Swagger UI

1. **Start the server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open Swagger UI** in your browser:
   ```
   http://localhost:4000/api-docs
   ```

3. **Navigate** through the API sections:
   - `Auth - Setup` - Initial setup endpoints
   - `Auth - Authentication` - Login/logout endpoints
   - `Auth - Terminal` - Terminal management
   - `Auth - Super Admin` - Super admin operations
   - `Auth - Store Manager` - Store management operations
   - `Auth - User` - User management operations
   - `Health` - Health check endpoint

---

## Testing Authentication APIs

### 1. Create Initial Super Admin (First Time Setup)

**Location**: `Auth - Setup` → `POST /api/auth/setup/super-admin`

**Steps**:
1. Expand the `POST /api/auth/setup/super-admin` endpoint
2. Click **"Try it out"** button
3. Fill in the request body:
   ```json
   {
     "username": "superadmin",
     "email": "admin@example.com",
     "password": "SecurePassword123!",
     "firstName": "John",
     "lastName": "Doe",
     "phone": "+1234567890"
   }
   ```
4. Click **"Execute"**
5. Check the response - you should see:
   ```json
   {
     "success": true,
     "message": "Super admin created successfully",
     "user": {
       "id": "user-uuid",
       "username": "superadmin",
       "email": "admin@example.com",
       "firstName": "John",
       "lastName": "Doe",
       "role": "SUPER_ADMIN"
     }
   }
   ```

**⚠️ Important**: 
- This endpoint only works if NO super admin exists
- After first use, it will return an error
- No authentication required

---

### 2. Admin Login

**Location**: `Auth - Authentication` → `POST /api/auth/admin/login`

**Steps**:
1. Expand the `POST /api/auth/admin/login` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "username": "superadmin",
     "password": "SecurePassword123!"
   }
   ```
4. Click **"Execute"**
5. **Copy the `accessToken`** from the response - you'll need it for authenticated endpoints:
   ```json
   {
     "success": true,
     "user": { ... },
     "tokens": {
       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "expiresIn": 28800
     },
     "permissions": []
   }
   ```

**💡 Tip**: Save the `accessToken` - you'll need it for all protected endpoints!

---

### 3. Authorize in Swagger UI

**Steps**:
1. Click the **"Authorize"** button at the top right of Swagger UI
2. In the `bearerAuth` field, paste your `accessToken` (without "Bearer " prefix)
3. Click **"Authorize"**
4. Click **"Close"**

Now all protected endpoints will automatically include your token!

---

### 4. Register Store (Super Admin)

**Location**: `Auth - Super Admin` → `POST /api/auth/store/register`

**Prerequisites**: 
- Must be logged in as SUPER_ADMIN
- Must have authorized in Swagger UI (see step 3)

**Steps**:
1. Expand the `POST /api/auth/store/register` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "storeCode": "STORE001",
     "storeName": "Main Store",
     "legalName": "Main Store Inc.",
     "email": "store@example.com",
     "phone": "+1234567890",
     "addressLine1": "123 Main St",
     "city": "New York",
     "state": "NY",
     "zipCode": "10001",
     "timezone": "America/New_York",
     "defaultCurrency": "USD"
   }
   ```
4. Click **"Execute"**
5. **Save the `id`** from the response - you'll need it for branches and users:
   ```json
   {
     "id": "store-uuid-here",
     "storeCode": "STORE001",
     "storeName": "Main Store",
     ...
   }
   ```

---

### 5. Register Branch (Store Manager)

**Location**: `Auth - Store Manager` → `POST /api/auth/branch/register`

**Prerequisites**:
- Must be logged in as SUPER_ADMIN or STORE_MANAGER
- Must have a store ID from step 4

**Steps**:
1. Expand the `POST /api/auth/branch/register` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "storeId": "store-uuid-from-step-4",
     "branchCode": "BRANCH001",
     "branchName": "Downtown Branch",
     "email": "branch@example.com",
     "phone": "+1234567891",
     "addressLine1": "456 Branch St",
     "city": "New York",
     "state": "NY",
     "zipCode": "10002",
     "timezone": "America/New_York",
     "currency": "USD"
   }
   ```
4. Click **"Execute"**
5. **Save the `id`** from the response for terminal registration

---

### 6. Register Terminal (Store Manager)

**Location**: `Auth - Store Manager` → `POST /api/auth/terminal/register`

**Prerequisites**:
- Must be logged in as SUPER_ADMIN or STORE_MANAGER
- Must have store ID and branch ID

**Steps**:
1. Expand the `POST /api/auth/terminal/register` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "storeId": "store-uuid",
     "branchId": "branch-uuid",
     "terminalCode": "TERM001",
     "terminalName": "Terminal 1",
     "macAddress": "00:1B:44:11:3A:B7",
     "serialNumber": "SN123456",
     "features": ["POS", "INVENTORY"],
     "allowedIPs": ["192.168.1.100"]
   }
   ```
4. Click **"Execute"**
5. **Save the `activationCode` and `apiKey`** from the response:
   ```json
   {
     "success": true,
     "terminal": { ... },
     "activationCode": "123456",
     "apiKey": "abc123def456...",
     "expiresAt": "2024-01-02T00:00:00Z"
   }
   ```

---

### 7. Activate Terminal (First Time)

**Location**: `Auth - Terminal` → `POST /api/auth/terminal/activate`

**Prerequisites**: 
- Must have activation code from step 6
- No authentication required

**Steps**:
1. Expand the `POST /api/auth/terminal/activate` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "activationCode": "123456",
     "macAddress": "00:1B:44:11:3A:B7",
     "ipAddress": "192.168.1.100",
     "serialNumber": "SN123456"
   }
   ```
4. Click **"Execute"**
5. Save the `token` from the response for terminal API calls

---

### 8. Create User (Store Manager)

**Location**: `Auth - Store Manager` → `POST /api/auth/user/create`

**Prerequisites**:
- Must be logged in as SUPER_ADMIN or STORE_MANAGER
- Must have store ID

**Steps**:
1. Expand the `POST /api/auth/user/create` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "storeId": "store-uuid",
     "username": "cashier1",
     "email": "cashier1@example.com",
     "password": "SecurePass123!",
     "firstName": "Jane",
     "lastName": "Smith",
     "phone": "+1234567892",
     "role": "CASHIER",
     "permissions": [],
     "mustChangePassword": false
   }
   ```
4. Click **"Execute"**
5. User is created and welcome email is sent

**Available Roles**:
- `SUPER_ADMIN` - Full system access
- `STORE_MANAGER` - Store management
- `ASSISTANT_MANAGER` - Limited store management
- `CASHIER` - POS operations
- `INVENTORY_MANAGER` - Inventory management
- `CUSTOMER_SERVICE` - Customer service

---

### 9. List Users

**Location**: `Auth - Store Manager` → `GET /api/auth/user/list`

**Steps**:
1. Expand the `GET /api/auth/user/list` endpoint
2. Click **"Try it out"**
3. Fill in the query parameter:
   - `storeId`: "store-uuid"
4. Click **"Execute"**
5. View the list of users

---

### 10. List Terminals

**Location**: `Auth - Store Manager` → `GET /api/auth/terminal/list`

**Steps**:
1. Expand the `GET /api/auth/terminal/list` endpoint
2. Click **"Try it out"**
3. Fill in the query parameter:
   - `storeId`: "store-uuid"
4. Click **"Execute"**
5. View the list of terminals

---

### 11. Refresh Token

**Location**: `Auth - Authentication` → `POST /api/auth/refresh`

**Steps**:
1. Expand the `POST /api/auth/refresh` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "refreshToken": "your-refresh-token-here"
   }
   ```
4. Click **"Execute"**
5. Get new access token

---

### 12. Logout

**Location**: `Auth - Authentication` → `POST /api/auth/logout`

**Prerequisites**: Must be logged in

**Steps**:
1. Expand the `POST /api/auth/logout` endpoint
2. Click **"Try it out"**
3. Click **"Execute"** (no body required)
4. Token is blacklisted

---

### 13. Change Password

**Location**: `Auth - User` → `POST /api/auth/user/change-password`

**Prerequisites**: Must be logged in

**Steps**:
1. Expand the `POST /api/auth/user/change-password` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "currentPassword": "old-password",
     "newPassword": "new-secure-password"
   }
   ```
4. Click **"Execute"**

---

### 14. Request Password Reset

**Location**: `Auth - User` → `POST /api/auth/user/request-password-reset`

**Steps**:
1. Expand the `POST /api/auth/user/request-password-reset` endpoint
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "email": "user@example.com"
   }
   ```
4. Click **"Execute"**
5. Password reset email is sent

---

## Complete Workflow Examples

### Workflow 1: Initial System Setup

1. **Create Super Admin**
   - `POST /api/auth/setup/super-admin`
   - Save credentials

2. **Login as Super Admin**
   - `POST /api/auth/admin/login`
   - Copy `accessToken`
   - Click "Authorize" in Swagger and paste token

3. **Register Store**
   - `POST /api/auth/store/register`
   - Save `storeId`

4. **Register Branch**
   - `POST /api/auth/branch/register`
   - Save `branchId`

5. **Register Terminal**
   - `POST /api/auth/terminal/register`
   - Save `activationCode` and `apiKey`

6. **Create Store Manager**
   - `POST /api/auth/user/create`
   - Role: `STORE_MANAGER`

7. **Create Cashier**
   - `POST /api/auth/user/create`
   - Role: `CASHIER`

---

### Workflow 2: Terminal Activation

1. **Get Activation Code**
   - Admin registers terminal via `POST /api/auth/terminal/register`
   - Receives `activationCode` in response

2. **Activate Terminal**
   - `POST /api/auth/terminal/activate`
   - Use `activationCode` from step 1
   - Terminal receives `token` and `apiKey`

3. **Terminal Authentication (Future Logins)**
   - `POST /api/auth/terminal/authenticate`
   - Use `apiKey` from step 2

---

## Common API Calls

### Quick Reference

| Endpoint | Method | Auth Required | Section |
|----------|--------|---------------|---------|
| `/api/auth/setup/super-admin` | POST | ❌ No | Auth - Setup |
| `/api/auth/admin/login` | POST | ❌ No | Auth - Authentication |
| `/api/auth/refresh` | POST | ❌ No | Auth - Authentication |
| `/api/auth/logout` | POST | ✅ Yes | Auth - Authentication |
| `/api/auth/store/register` | POST | ✅ SUPER_ADMIN | Auth - Super Admin |
| `/api/auth/branch/register` | POST | ✅ SUPER_ADMIN, STORE_MANAGER | Auth - Store Manager |
| `/api/auth/terminal/register` | POST | ✅ SUPER_ADMIN, STORE_MANAGER | Auth - Store Manager |
| `/api/auth/terminal/activate` | POST | ❌ No | Auth - Terminal |
| `/api/auth/terminal/authenticate` | POST | ❌ No | Auth - Terminal |
| `/api/auth/user/create` | POST | ✅ SUPER_ADMIN, STORE_MANAGER | Auth - Store Manager |
| `/api/auth/user/list` | GET | ✅ Yes | Auth - Store Manager |
| `/api/auth/terminal/list` | GET | ✅ Yes | Auth - Store Manager |
| `/api/auth/user/change-password` | POST | ✅ Yes | Auth - User |
| `/api/auth/user/request-password-reset` | POST | ❌ No | Auth - User |

---

## Troubleshooting

### Issue: "401 Unauthorized"

**Solution**:
1. Make sure you're logged in via `POST /api/auth/admin/login`
2. Copy the `accessToken` from the response
3. Click "Authorize" button in Swagger UI
4. Paste the token in the `bearerAuth` field
5. Click "Authorize" and "Close"

### Issue: "403 Forbidden"

**Solution**:
- Check that your user has the required role
- Super admin endpoints require `SUPER_ADMIN` role
- Store manager endpoints require `SUPER_ADMIN` or `STORE_MANAGER` role

### Issue: "Super admin already exists"

**Solution**:
- This endpoint only works once for initial setup
- Use `POST /api/auth/user/create` with role `SUPER_ADMIN` instead
- Or use `POST /api/auth/user/create` with role `STORE_MANAGER` for store admins

### Issue: "Username or email already exists"

**Solution**:
- Choose a different username or email
- Check existing users via `GET /api/auth/user/list`

### Issue: "Store not found"

**Solution**:
- Make sure you've registered a store first
- Use the correct `storeId` from the store registration response

### Issue: Token Expired

**Solution**:
1. Use `POST /api/auth/refresh` with your `refreshToken`
2. Get a new `accessToken`
3. Update the authorization in Swagger UI

### Issue: Can't see response body

**Solution**:
- Scroll down in the Swagger UI response section
- Check the "Response body" section
- Look for error messages in the response

---

## Tips & Best Practices

1. **Always Authorize First**: After logging in, always click "Authorize" and paste your token
2. **Save Important IDs**: Store IDs, branch IDs, terminal codes, etc. for later use
3. **Check Response Codes**: 
   - `200` = Success
   - `201` = Created
   - `400` = Bad Request (check your input)
   - `401` = Unauthorized (check your token)
   - `403` = Forbidden (check your role)
4. **Use Copy Button**: Swagger UI has a "Copy" button for request/response examples
5. **Test in Order**: Follow the workflow examples for best results
6. **Check Server Logs**: If something fails, check the server console for detailed errors

---

## Example Request Bodies

### Super Admin Setup
```json
{
  "username": "superadmin",
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

### Store Registration
```json
{
  "storeCode": "STORE001",
  "storeName": "Main Store",
  "legalName": "Main Store Inc.",
  "email": "store@example.com",
  "phone": "+1234567890",
  "addressLine1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "timezone": "America/New_York",
  "defaultCurrency": "USD"
}
```

### User Creation
```json
{
  "storeId": "store-uuid",
  "username": "cashier1",
  "email": "cashier1@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567892",
  "role": "CASHIER",
  "permissions": [],
  "mustChangePassword": false
}
```

### Terminal Registration
```json
{
  "storeId": "store-uuid",
  "branchId": "branch-uuid",
  "terminalCode": "TERM001",
  "terminalName": "Terminal 1",
  "macAddress": "00:1B:44:11:3A:B7",
  "serialNumber": "SN123456",
  "features": ["POS", "INVENTORY"],
  "allowedIPs": ["192.168.1.100"]
}
```

---

## Need Help?

- Check the server console for detailed error messages
- Review the `QUICK_START.md` in the auth module for detailed API documentation
- Check the Swagger schema for required fields
- Verify your authentication token is valid and not expired

---

**Happy Testing! 🚀**

