# Authentication Module - Quick Start Guide

Complete guide to using the Authentication API endpoints with registration flows, priorities, timing, and best practices.

## Table of Contents

- [Overview](#overview)
- [Complete Registration Flow](#complete-registration-flow)
- [API Endpoints](#api-endpoints)
- [Authentication Flows](#authentication-flows)
- [Role-Based Permissions](#role-based-permissions)
- [Email Notifications](#email-notifications)
- [Timing & Best Practices](#timing--best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Authentication Module provides complete user, store, branch, and terminal management with JWT-based authentication, role-based permissions, and automated email notifications.

**Base URL**: `http://your-server:4000/api/auth`

**Authentication**: Bearer token (required for protected endpoints)

---

## Complete Registration Flow

### Step 0: Create Initial Super Admin (First Time Setup)

**Endpoint**: `POST /api/auth/setup/super-admin`

**Priority**: CRITICAL - Must be done first, only works if no super admin exists

**When to Call**: Initial system setup - before any other operations

**Request**:
```http
POST /api/auth/setup/super-admin
Content-Type: application/json

{
  "username": "superadmin",
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response**:
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

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/setup/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**⚠️ Important**: 
- This endpoint only works if NO super admin exists yet
- After creating the first super admin, this endpoint will return an error
- Use this only for initial system setup
- Store credentials securely
- Welcome email will be sent to the new super admin

**After Creating Super Admin**:
1. Use the credentials to log in via `/api/auth/admin/login`
2. Get the access token from login response
3. Use the token to register stores and continue setup

---

### Step 1: Register Store (Super Admin)

**Endpoint**: `POST /api/auth/store/register`

**Priority**: CRITICAL - First step in system setup

**When to Call**: Initial system setup by Super Admin

**Request**:
```http
POST /api/auth/store/register
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_TOKEN

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

**Response**:
```json
{
  "id": "store-uuid",
  "storeCode": "STORE001",
  "storeName": "Main Store",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/store/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -d '{
    "storeCode": "STORE001",
    "storeName": "Main Store",
    "email": "store@example.com"
  }'
```

---

### Step 2: Register Branch (Store Manager)

**Endpoint**: `POST /api/auth/branch/register`

**Priority**: HIGH - Required before terminal registration

**When to Call**: After store registration, before terminal setup

**Request**:
```http
POST /api/auth/branch/register
Content-Type: application/json
Authorization: Bearer STORE_MANAGER_TOKEN

{
  "storeId": "store-uuid",
  "branchCode": "BRANCH001",
  "branchName": "Downtown Branch",
  "email": "branch@example.com",
  "phone": "+1234567891",
  "addressLine1": "456 Oak Ave",
  "city": "New York",
  "state": "NY",
  "zipCode": "10002",
  "timezone": "America/New_York",
  "currency": "USD",
  "taxRate": 0.08
}
```

**Response**:
```json
{
  "id": "branch-uuid",
  "storeId": "store-uuid",
  "branchCode": "BRANCH001",
  "branchName": "Downtown Branch",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/branch/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STORE_MANAGER_TOKEN" \
  -d '{
    "storeId": "store-uuid",
    "branchCode": "BRANCH001",
    "branchName": "Downtown Branch"
  }'
```

---

### Step 3: Register Terminal (Store Manager)

**Endpoint**: `POST /api/auth/terminal/register`

**Priority**: HIGH - Required for terminal activation

**When to Call**: When setting up a new terminal

**Request**:
```http
POST /api/auth/terminal/register
Content-Type: application/json
Authorization: Bearer STORE_MANAGER_TOKEN

{
  "storeId": "store-uuid",
  "branchId": "branch-uuid",
  "locationId": "location-uuid",
  "terminalCode": "TERM001",
  "terminalName": "Terminal 1",
  "macAddress": "00:1B:44:11:3A:B7",
  "serialNumber": "SN123456",
  "features": ["POS", "INVENTORY"],
  "allowedIPs": ["192.168.1.100"]
}
```

**Response**:
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1"
  },
  "activationCode": "123456",
  "apiKey": "abc123def456...",
  "expiresAt": "2024-01-02T00:00:00Z"
}
```

**⚠️ Important**: 
- Save the `activationCode` - it's needed for terminal activation
- Save the `apiKey` - it's needed for terminal authentication
- Activation code expires in 24 hours
- Admin receives email with activation code

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/terminal/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STORE_MANAGER_TOKEN" \
  -d '{
    "storeId": "store-uuid",
    "branchId": "branch-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1",
    "macAddress": "00:1B:44:11:3A:B7"
  }'
```

---

### Step 4: Activate Terminal (First Time)

**Endpoint**: `POST /api/auth/terminal/activate`

**Priority**: CRITICAL - Required for terminal to work

**When to Call**: First time terminal setup, using activation code from registration

**Request**:
```http
POST /api/auth/terminal/activate
Content-Type: application/json

{
  "activationCode": "123456",
  "macAddress": "00:1B:44:11:3A:B7",
  "ipAddress": "192.168.1.100",
  "serialNumber": "SN123456"
}
```

**Response**:
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1",
    "apiKey": "abc123def456...",
    "store": { ... },
    "branch": { ... },
    "location": { ... },
    "features": ["POS", "INVENTORY"]
  },
  "token": "jwt-terminal-token-here"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/terminal/activate \
  -H "Content-Type: application/json" \
  -d '{
    "activationCode": "123456",
    "macAddress": "00:1B:44:11:3A:B7",
    "ipAddress": "192.168.1.100"
  }'
```

**After Activation**:
- Terminal is now active and can authenticate
- Save the `apiKey` for future authentication
- Save the `token` for immediate API access
- Admin receives email confirmation

---

### Step 5: Create Users (Store Manager)

**Endpoint**: `POST /api/auth/user/create`

**Priority**: HIGH - Required for user access

**When to Call**: When creating new user accounts

**Request**:
```http
POST /api/auth/user/create
Content-Type: application/json
Authorization: Bearer STORE_MANAGER_TOKEN

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

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "cashier1",
    "email": "cashier1@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "CASHIER",
    "isActive": true
  }
}
```

**Email Sent**: Welcome email with account details (and temporary password if `mustChangePassword: true`)

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/user/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STORE_MANAGER_TOKEN" \
  -d '{
    "storeId": "store-uuid",
    "username": "cashier1",
    "email": "cashier1@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "CASHIER"
  }'
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Admin Login

**Endpoint**: `POST /api/auth/admin/login`

**Priority**: CRITICAL - Required for admin access

**When to Call**: When admin needs to log in

**Request**:
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "admin",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STORE_MANAGER",
    "store": { ... }
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 28800
  },
  "permissions": [
    "store:read",
    "store:write",
    "user:read",
    "user:write",
    ...
  ]
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

**Security Notes**:
- Account locks after 5 failed attempts (30 minutes)
- Email sent when account is locked
- Login attempts are logged

---

#### 2. Terminal Authentication

**Endpoint**: `POST /api/auth/terminal/authenticate`

**Priority**: CRITICAL - Required for terminal API access

**When to Call**: 
- On terminal startup
- When token expires
- Periodically to refresh connection

**Request**:
```http
POST /api/auth/terminal/authenticate
Content-Type: application/json

{
  "apiKey": "abc123def456...",
  "macAddress": "00:1B:44:11:3A:B7",
  "ipAddress": "192.168.1.100"
}
```

**Response**:
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1",
    "store": { ... },
    "branch": { ... },
    "location": { ... },
    "features": ["POS", "INVENTORY"]
  },
  "token": "jwt-terminal-token"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/terminal/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "abc123def456...",
    "macAddress": "00:1B:44:11:3A:B7",
    "ipAddress": "192.168.1.100"
  }'
```

**Security Notes**:
- MAC address is verified
- Terminal must be active
- Token expires in 24 hours

---

#### 3. Token Refresh

**Endpoint**: `POST /api/auth/refresh`

**Priority**: MEDIUM - Use when access token expires

**When to Call**: When access token expires (before it expires is better)

**Request**:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

**Response**:
```json
{
  "success": true,
  "tokens": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token",
    "expiresIn": 28800
  },
  "type": "user"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "jwt-refresh-token"
  }'
```

---

#### 4. Logout

**Endpoint**: `POST /api/auth/logout`

**Priority**: LOW - Cleanup operation

**When to Call**: When user logs out

**Request**:
```http
POST /api/auth/logout
Authorization: Bearer ACCESS_TOKEN
```

**Response**:
```json
{
  "success": true
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

### Registration Endpoints

#### 5. Register Store

**Endpoint**: `POST /api/auth/store/register`

**Priority**: CRITICAL - First step in setup

**Required Role**: SUPER_ADMIN

**See**: [Step 1: Register Store](#step-1-register-store-super-admin)

---

#### 6. Register Branch

**Endpoint**: `POST /api/auth/branch/register`

**Priority**: HIGH - Required before terminals

**Required Role**: SUPER_ADMIN, STORE_MANAGER

**See**: [Step 2: Register Branch](#step-2-register-branch-store-manager)

---

#### 7. Register Terminal

**Endpoint**: `POST /api/auth/terminal/register`

**Priority**: HIGH - Required for terminal setup

**Required Role**: SUPER_ADMIN, STORE_MANAGER

**See**: [Step 3: Register Terminal](#step-3-register-terminal-store-manager)

---

#### 8. Activate Terminal

**Endpoint**: `POST /api/auth/terminal/activate`

**Priority**: CRITICAL - Required for terminal to work

**Required Role**: None (public endpoint)

**See**: [Step 4: Activate Terminal](#step-4-activate-terminal-first-time)

---

### User Management Endpoints

#### 9. Create User

**Endpoint**: `POST /api/auth/user/create`

**Priority**: HIGH - Required for user access

**Required Role**: SUPER_ADMIN, STORE_MANAGER

**See**: [Step 5: Create Users](#step-5-create-users-store-manager)

---

#### 10. List Users

**Endpoint**: `GET /api/auth/user/list`

**Priority**: LOW - Administrative

**Required Role**: Any authenticated user

**Request**:
```http
GET /api/auth/user/list?storeId=store-uuid
Authorization: Bearer ACCESS_TOKEN
```

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "username": "cashier1",
      "email": "cashier1@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "CASHIER",
      "isActive": true
    },
    ...
  ]
}
```

**Example with cURL**:
```bash
curl -X GET "http://localhost:4000/api/auth/user/list?storeId=store-uuid" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

#### 11. Change Password

**Endpoint**: `POST /api/auth/user/change-password`

**Priority**: MEDIUM - User self-service

**Required Role**: Authenticated user (own password)

**Request**:
```http
POST /api/auth/user/change-password
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response**:
```json
{
  "success": true
}
```

**Email Sent**: Password changed notification with IP address and timestamp

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/user/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456"
  }'
```

---

#### 12. Request Password Reset

**Endpoint**: `POST /api/auth/user/request-password-reset`

**Priority**: HIGH - User recovery

**Required Role**: None (public endpoint)

**Request**:
```http
POST /api/auth/user/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Email Sent**: Password reset email with reset link and token

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/auth/user/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Security Notes**:
- Response doesn't reveal if email exists (security best practice)
- Reset token expires in 1 hour
- Reset link includes token in URL

---

#### 13. List Terminals

**Endpoint**: `GET /api/auth/terminal/list`

**Priority**: LOW - Administrative

**Required Role**: Any authenticated user

**Request**:
```http
GET /api/auth/terminal/list?storeId=store-uuid
Authorization: Bearer ACCESS_TOKEN
```

**Response**:
```json
{
  "success": true,
  "terminals": [
    {
      "id": "terminal-uuid",
      "terminalCode": "TERM001",
      "terminalName": "Terminal 1",
      "isActive": true,
      "status": "ONLINE",
      "branch": { ... },
      "location": { ... },
      "terminalActivation": { ... }
    },
    ...
  ]
}
```

**Example with cURL**:
```bash
curl -X GET "http://localhost:4000/api/auth/terminal/list?storeId=store-uuid" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Authentication Flows

### Complete Setup Flow

```
1. Super Admin Login
   ↓
2. Register Store
   ↓
3. Register Branch
   ↓
4. Register Terminal (get activation code)
   ↓
5. Terminal Activation (first time)
   ↓
6. Terminal Authentication (normal operation)
   ↓
7. Create Users
   ↓
8. User Login
```

### Terminal Startup Flow

```
Terminal Starts
   ↓
Check if activated
   ├─ No → Show activation screen
   │      ↓
   │   Enter activation code
   │      ↓
   │   Activate terminal
   │      ↓
   └─ Yes → Authenticate with API key
            ↓
         Get JWT token
            ↓
         User login required
            ↓
         Show login screen
```

### User Login Flow

```
User Login
   ↓
Enter credentials
   ↓
Server validates
   ├─ Success → Generate tokens
   │              ↓
   │           Return tokens + permissions
   │              ↓
   │           User can access system
   │
   └─ Failure → Increment attempts
                 ↓
              Check lock threshold
                 ├─ < 5 attempts → Return error
                 └─ ≥ 5 attempts → Lock account
                                      ↓
                                   Send lock email
```

---

## Role-Based Permissions

### Roles and Access Levels

| Role | Access Level | Can Register | Can Manage |
|------|--------------|--------------|------------|
| **SUPER_ADMIN** | System-wide | Stores, Branches, Terminals, Users | Everything |
| **STORE_MANAGER** | Store-wide | Branches, Terminals, Users | Store, Branches, Terminals, Users |
| **ASSISTANT_MANAGER** | Branch-wide | None | Branch operations |
| **CASHIER** | Terminal-only | None | Sales operations |
| **INVENTORY_MANAGER** | Store-wide | None | Inventory |
| **CUSTOMER_SERVICE** | Store-wide | None | Customers, Returns |

### Permission Examples

**Check Permissions in Code**:
```typescript
import { PermissionService } from './modules/auth';

const permissionService = new PermissionService(centralDb);

// Check single permission
const canCreateSale = await permissionService.hasPermission(userId, 'sale:create');

// Check multiple permissions (any)
const canManageProducts = await permissionService.hasAnyPermission(userId, [
  'product:read',
  'product:write'
]);

// Check multiple permissions (all)
const canFullAccess = await permissionService.hasAllPermissions(userId, [
  'product:read',
  'product:write',
  'product:delete'
]);
```

**Use in Routes**:
```typescript
import { PermissionMiddleware } from './modules/auth';

const permissionMiddleware = new PermissionMiddleware(centralDb);

// Require specific role
router.post('/admin',
  authMiddleware.authenticateUser,
  permissionMiddleware.requireRole(['SUPER_ADMIN', 'STORE_MANAGER']),
  handler
);

// Require specific permission
router.post('/sales',
  authMiddleware.authenticateUser,
  permissionMiddleware.requirePermission('sale:create'),
  handler
);

// Require store access
router.get('/store/:storeId',
  authMiddleware.authenticateUser,
  permissionMiddleware.requireStoreAccess('storeId'),
  handler
);
```

---

## Email Notifications

### Automatic Email Triggers

| Event | Email Type | Recipient | When |
|-------|------------|-----------|------|
| User Created | Welcome Email | New User | Immediately |
| Password Reset Request | Reset Email | User | On request |
| Password Changed | Change Notification | User | Immediately |
| Account Locked | Lock Alert | User | After 5 failed attempts |
| Terminal Registered | Activation Code | Admin | Immediately |
| Terminal Activated | Activation Confirmation | Admin | On activation |

### Email Configuration

Set these environment variables:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Settings
MAIL_FROM=no-reply@yourdomain.com
MAIL_FROM_NAME=POS System
FRONTEND_URL=http://localhost:3000
```

### Email Templates

All emails are HTML-based and responsive. Templates include:
- Welcome emails with temporary passwords
- Password reset links with tokens
- Security alerts with details
- Terminal activation codes
- Account status notifications

---

## Timing & Best Practices

### Registration Timing

| Operation | Frequency | Priority |
|-----------|-----------|----------|
| Store Registration | One-time setup | CRITICAL |
| Branch Registration | Per branch | HIGH |
| Terminal Registration | Per terminal | HIGH |
| Terminal Activation | One-time per terminal | CRITICAL |
| User Creation | As needed | MEDIUM |

### Authentication Timing

| Operation | Frequency | Priority |
|-----------|-----------|----------|
| Admin Login | As needed | CRITICAL |
| Terminal Auth | On startup, every 24h | CRITICAL |
| Token Refresh | Before expiration | MEDIUM |
| User Login | As needed | HIGH |
| Logout | On session end | LOW |

### Best Practices

#### 1. Store & Branch Registration

✅ **Do**:
- Register store first (Super Admin only)
- Register branches before terminals
- Use consistent naming conventions
- Include complete address information

❌ **Don't**:
- Skip branch registration
- Use duplicate codes
- Register terminals without branches

#### 2. Terminal Registration

✅ **Do**:
- Register terminal before physical setup
- Save activation code securely
- Verify MAC address matches hardware
- Set appropriate features and IP restrictions

❌ **Don't**:
- Share activation codes publicly
- Use expired activation codes
- Skip MAC address verification

#### 3. User Management

✅ **Do**:
- Create users with appropriate roles
- Set `mustChangePassword: true` for new users
- Use strong passwords
- Monitor user activity

❌ **Don't**:
- Share user credentials
- Use weak passwords
- Create users without email addresses
- Skip role assignment

#### 4. Authentication

✅ **Do**:
- Store tokens securely
- Refresh tokens before expiration
- Handle token expiration gracefully
- Log out when done

❌ **Don't**:
- Store tokens in localStorage (use httpOnly cookies)
- Share tokens between users
- Ignore token expiration
- Leave sessions open indefinitely

#### 5. Security

✅ **Do**:
- Use HTTPS in production
- Implement rate limiting
- Monitor failed login attempts
- Review audit logs regularly

❌ **Don't**:
- Expose API keys
- Skip MAC address verification
- Ignore security alerts
- Use default passwords

---

## Troubleshooting

### Common Issues

**1. "Invalid credentials" on login**
- Check username/password spelling
- Verify account is active (`isActive: true`)
- Check if account is locked (`lockedUntil` field)
- Review audit logs for failed attempts

**2. "Account locked"**
- Account locks after 5 failed login attempts
- Lock duration: 30 minutes
- Wait for unlock or contact admin
- Check email for lock notification

**3. "Terminal not active"**
- Terminal must be activated first
- Check activation code expiration (24 hours)
- Verify MAC address matches
- Contact admin for new activation code

**4. "Insufficient permissions"**
- Check user role
- Verify required permissions
- Contact admin to update permissions
- Review role-permission mappings

**5. "Activation code expired"**
- Activation codes expire in 24 hours
- Request new activation code from admin
- Admin can re-register terminal if needed

**6. "Token expired"**
- Access tokens expire in 8 hours
- Use refresh token to get new access token
- Refresh before expiration

**7. "Email not sent"**
- Check SMTP configuration
- Verify email addresses are valid
- Check server logs for email errors
- Email failures don't break operations

### Debugging Tips

**Check User Status**:
```typescript
const user = await centralDb.user.findUnique({
  where: { id: userId },
  select: {
    isActive: true,
    lockedUntil: true,
    loginAttempts: true,
    lastLoginAt: true
  }
});
```

**Check Terminal Status**:
```typescript
const terminal = await centralDb.terminal.findUnique({
  where: { id: terminalId },
  select: {
    isActive: true,
    status: true,
    lastHeartbeat: true
  }
});
```

**Check Audit Logs**:
```typescript
const logs = await centralDb.auditLog.findMany({
  where: {
    entityType: 'User',
    entityId: userId,
    action: { in: ['AUTH_SUCCESS', 'AUTH_FAILURE'] }
  },
  orderBy: { createdAt: 'desc' },
  take: 10
});
```

---

## API Summary Table

| Endpoint | Method | Auth Required | Role Required | Priority | Frequency |
|----------|--------|---------------|---------------|----------|-----------|
| `/admin/login` | POST | No | None | CRITICAL | As needed |
| `/terminal/authenticate` | POST | No | None | CRITICAL | On startup |
| `/terminal/activate` | POST | No | None | CRITICAL | One-time |
| `/refresh` | POST | No | None | MEDIUM | Before expiry |
| `/logout` | POST | Yes | None | LOW | On logout |
| `/store/register` | POST | Yes | SUPER_ADMIN | CRITICAL | One-time |
| `/branch/register` | POST | Yes | ADMIN | HIGH | Per branch |
| `/terminal/register` | POST | Yes | ADMIN | HIGH | Per terminal |
| `/terminal/list` | GET | Yes | None | LOW | As needed |
| `/user/create` | POST | Yes | ADMIN | HIGH | As needed |
| `/user/list` | GET | Yes | None | LOW | As needed |
| `/user/change-password` | POST | Yes | None | MEDIUM | As needed |
| `/user/request-password-reset` | POST | No | None | HIGH | As needed |

---

## Complete Example Workflow

### Initial System Setup

```bash
# 0. Create initial super admin (first time only)
curl -X POST http://localhost:4000/api/auth/setup/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Response: { "success": true, "user": { ... } }

# 1. Super Admin logs in
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "SecurePassword123!"}'

# Response: { "tokens": { "accessToken": "..." } }

# 2. Register store
curl -X POST http://localhost:4000/api/auth/store/register \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeCode": "STORE001",
    "storeName": "Main Store"
  }'

# Response: { "id": "store-uuid", ... }

# 3. Register branch
curl -X POST http://localhost:4000/api/auth/branch/register \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store-uuid",
    "branchCode": "BRANCH001",
    "branchName": "Downtown Branch"
  }'

# Response: { "id": "branch-uuid", ... }

# 4. Register terminal
curl -X POST http://localhost:4000/api/auth/terminal/register \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store-uuid",
    "branchId": "branch-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1",
    "macAddress": "00:1B:44:11:3A:B7"
  }'

# Response: { "activationCode": "123456", "apiKey": "..." }

# 5. Activate terminal (on terminal device)
curl -X POST http://localhost:4000/api/auth/terminal/activate \
  -H "Content-Type: application/json" \
  -d '{
    "activationCode": "123456",
    "macAddress": "00:1B:44:11:3A:B7",
    "ipAddress": "192.168.1.100"
  }'

# Response: { "token": "...", "terminal": { "apiKey": "..." } }

# 6. Create user
curl -X POST http://localhost:4000/api/auth/user/create \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store-uuid",
    "username": "cashier1",
    "email": "cashier1@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "CASHIER"
  }'

# Response: { "success": true, "user": { ... } }
# Email sent: Welcome email to cashier1@example.com
```

### Normal Operation Flow

```bash
# 1. Terminal authenticates
curl -X POST http://localhost:4000/api/auth/terminal/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "abc123...",
    "macAddress": "00:1B:44:11:3A:B7",
    "ipAddress": "192.168.1.100"
  }'

# Response: { "token": "terminal-jwt-token", ... }

# 2. User logs in
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cashier1",
    "password": "SecurePass123!"
  }'

# Response: { "tokens": { "accessToken": "...", "refreshToken": "..." }, ... }

# 3. Use access token for API calls
curl -X GET http://localhost:4000/api/sync/status \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 4. Refresh token when needed
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "refresh-token"}'

# 5. Logout when done
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Additional Resources

- **Full Documentation**: See `README.md` for detailed architecture
- **API Docs**: Visit `http://your-server:4000/api-docs` for Swagger documentation
- **Source Code**: Check `src/modules/auth/` for implementation details

---

**Last Updated**: 2025
**Version**: 1.0.0

