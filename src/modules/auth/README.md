# Authentication Module

Complete authentication system for store, branch, and terminal registration with user management, role-based permissions, and offline support.

## Features

- ✅ **Store & Branch Registration** - Register stores and branches with proper access control
- ✅ **Terminal Registration & Activation** - Secure terminal registration with activation codes
- ✅ **User Authentication** - JWT-based authentication with refresh tokens
- ✅ **Terminal Authentication** - API key-based terminal authentication
- ✅ **Role-Based Permissions** - Granular permission system
- ✅ **Offline Support** - Local authentication fallback for terminals
- ✅ **PIN Login** - Quick PIN-based login for POS terminals
- ✅ **Session Management** - Secure session handling with expiration
- ✅ **Audit Logging** - Comprehensive security audit trail
- ✅ **Account Security** - Password hashing, account locking, login attempts tracking
- ✅ **Email Notifications** - Automated emails for user creation, password resets, terminal activation, and security alerts

## Architecture

```
┌─────────────────┐    JWT Tokens    ┌──────────────────┐
│   Terminal      │ ◄───────────────►│  Central Server  │
│  (SQLite DB)    │    API Keys      │  (PostgreSQL)    │
└─────────────────┘                  └──────────────────┘
         │                                    │
         │ Local Auth                        │ Central Auth
         ▼                                    ▼
┌─────────────────┐                ┌──────────────────┐
│  Local Auth     │                │ Central Auth     │
│   Service       │                │   Service        │
└─────────────────┘                └──────────────────┘
```

## Module Structure

```
src/modules/auth/
├── central/              # Central server authentication
│   ├── CentralAuthService.ts
│   ├── UserService.ts
│   ├── TerminalRegistrationService.ts
│   ├── StoreRegistrationService.ts
│   ├── BranchRegistrationService.ts
│   ├── PermissionService.ts
│   └── AuditService.ts
├── local/                # Terminal-side authentication
│   ├── LocalAuthService.ts
│   └── UserSessionService.ts
├── security/             # Security utilities
│   ├── TokenService.ts
│   ├── CryptoService.ts
│   └── ApiKeyService.ts
├── middleware/           # Express middleware
│   ├── AuthMiddleware.ts
│   ├── PermissionMiddleware.ts
│   └── TerminalMiddleware.ts
├── api/                  # API routes
│   └── AuthApiRoutes.ts
└── types/                # Type definitions
    ├── AuthTypes.ts
    ├── PermissionTypes.ts
    └── SessionTypes.ts
```

## Quick Start

### 1. Register Store (Super Admin)

```http
POST /api/auth/store/register
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "storeCode": "STORE001",
  "storeName": "Main Store",
  "legalName": "Main Store Inc.",
  "email": "store@example.com",
  "phone": "+1234567890",
  "addressLine1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001"
}
```

### 2. Register Branch (Store Manager)

```http
POST /api/auth/branch/register
Authorization: Bearer <store_manager_token>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "branchCode": "BRANCH001",
  "branchName": "Downtown Branch",
  "email": "branch@example.com",
  "phone": "+1234567891"
}
```

### 3. Register Terminal (Store Manager)

```http
POST /api/auth/terminal/register
Authorization: Bearer <store_manager_token>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "branchId": "branch-uuid",
  "terminalCode": "TERM001",
  "terminalName": "Terminal 1",
  "macAddress": "00:1B:44:11:3A:B7",
  "serialNumber": "SN123456"
}
```

**Response:**
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "terminalName": "Terminal 1"
  },
  "activationCode": "123456",
  "apiKey": "abc123...",
  "expiresAt": "2024-01-02T00:00:00Z"
}
```

### 4. Activate Terminal (First Time)

```http
POST /api/auth/terminal/activate
Content-Type: application/json

{
  "activationCode": "123456",
  "macAddress": "00:1B:44:11:3A:B7",
  "ipAddress": "192.168.1.100"
}
```

**Response:**
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "apiKey": "abc123...",
    "store": { ... },
    "branch": { ... }
  },
  "token": "jwt-token-here"
}
```

### 5. Terminal Authentication (Normal Operation)

```http
POST /api/auth/terminal/authenticate
Content-Type: application/json

{
  "apiKey": "abc123...",
  "macAddress": "00:1B:44:11:3A:B7",
  "ipAddress": "192.168.1.100"
}
```

### 6. Admin User Login

```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
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
  "permissions": ["store:read", "store:write", ...]
}
```

### 7. Create User (Admin)

```http
POST /api/auth/user/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "username": "cashier1",
  "email": "cashier1@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "CASHIER"
}
```

## API Endpoints

### Authentication

- `POST /api/auth/admin/login` - Admin user login
- `POST /api/auth/terminal/authenticate` - Terminal authentication
- `POST /api/auth/terminal/activate` - Terminal activation
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Store Management

- `POST /api/auth/store/register` - Register new store (Super Admin)

### Branch Management

- `POST /api/auth/branch/register` - Register new branch (Admin)

### Terminal Management

- `POST /api/auth/terminal/register` - Register new terminal (Admin)
- `GET /api/auth/terminal/list` - List terminals for store

### User Management

- `POST /api/auth/user/create` - Create new user (Admin)
- `GET /api/auth/user/list` - List users for store
- `POST /api/auth/user/change-password` - Change user password
- `POST /api/auth/user/request-password-reset` - Request password reset email

## Authentication Flow

### Terminal Registration Flow

1. **Admin registers terminal** → Gets activation code and API key
2. **Terminal activates** → Uses activation code to activate
3. **Terminal authenticates** → Uses API key for normal operation
4. **User logs in** → Uses username/password or PIN

### User Authentication Flow

1. **User provides credentials** → Username/password or PIN
2. **Server validates** → Checks password, account status, permissions
3. **Server issues tokens** → Access token (8h) + Refresh token (7d)
4. **Client stores tokens** → Uses access token for API calls
5. **Token refresh** → Uses refresh token when access token expires

## Permissions

### Roles

- **SUPER_ADMIN** - Full system access
- **STORE_MANAGER** - Store management, user management
- **ASSISTANT_MANAGER** - Branch operations, inventory
- **CASHIER** - Sales operations, customer service
- **INVENTORY_MANAGER** - Inventory management
- **CUSTOMER_SERVICE** - Customer support, returns

### Permission Examples

```typescript
// Check if user has permission
const hasPermission = await permissionService.hasPermission(userId, 'sale:create');

// Require permission in route
router.post('/sales',
  authMiddleware.authenticateUser,
  permissionMiddleware.requirePermission('sale:create'),
  handler
);
```

## Security Features

### Password Security
- Bcrypt hashing (12 rounds)
- Account locking after 5 failed attempts
- Password change enforcement
- Password reset by admin

### Token Security
- JWT with expiration
- Refresh token rotation
- Token blacklisting on logout
- Secure token storage

### Terminal Security
- MAC address verification
- API key authentication
- Activation code expiration (24h)
- Hardware binding

### Audit Logging
- All authentication attempts logged
- Failed login tracking
- Terminal activation logging
- User action auditing

## Offline Support

Terminals can operate offline with:
- Local user authentication
- Cached user credentials
- PIN-based quick login
- Session validation

## Email Service

The auth module includes a comprehensive email service that automatically sends emails for:

- **Welcome Emails** - Sent when new users are created (includes temporary password if set)
- **Password Reset Emails** - Sent when users request password reset
- **Password Changed Notifications** - Sent when users change their password
- **Account Locked Alerts** - Sent when accounts are locked due to failed login attempts
- **Terminal Activation Emails** - Sent to admins with activation codes when terminals are registered
- **Terminal Activated Notifications** - Sent when terminals are successfully activated
- **Security Alerts** - Sent for security-related events

### Email Configuration

Set these environment variables for email functionality:

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

All email templates are HTML-based and responsive. Templates are located in `src/modules/auth/emails/EmailTemplates.ts` and can be customized as needed.

### Using Email Service

```typescript
import { EmailService } from './modules/auth';

const emailService = new EmailService();

// Send welcome email
await emailService.sendWelcomeEmail(user, temporaryPassword);

// Send password reset
await emailService.sendPasswordResetEmail(user, resetToken, resetUrl);

// Send terminal activation code
await emailService.sendTerminalActivationEmail(adminEmail, terminalData);
```

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=480

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=no-reply@yourdomain.com
MAIL_FROM_NAME=POS System
FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### Using Middleware

```typescript
import { AuthMiddleware } from './modules/auth';
import { PermissionMiddleware } from './modules/auth';

const authMiddleware = new AuthMiddleware();
const permissionMiddleware = new PermissionMiddleware(centralDb);

// Protect route with authentication
router.get('/protected',
  authMiddleware.authenticateUser,
  handler
);

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
```

### Using Services

```typescript
import { CentralAuthService } from './modules/auth';
import { UserService } from './modules/auth';

const authService = new CentralAuthService(centralDb);
const userService = new UserService(centralDb);

// Admin login
const result = await authService.adminLogin(username, password, ipAddress, userAgent);

// Create user
const user = await userService.createUser(adminUserId, userData);

// Register terminal
const terminal = await terminalRegistrationService.registerTerminal(adminUserId, terminalData);
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials"** - Check username/password, account status
2. **"Account locked"** - Wait 30 minutes or reset via admin
3. **"Token expired"** - Use refresh token to get new access token
4. **"Insufficient permissions"** - Check user role and permissions
5. **"Terminal not active"** - Terminal needs to be activated first

## Additional Resources

- See source code in `src/modules/auth/` for implementation details
- Check Swagger docs at `/api-docs` for interactive API documentation

