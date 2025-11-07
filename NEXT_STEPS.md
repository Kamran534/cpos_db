# Next Steps After Initial Setup

You've completed the initial setup! Here's what to do next:

## ✅ What You've Completed

1. ✅ Registered a store
2. ✅ Created 2 branches
3. ✅ Registered 2 terminals in a branch
4. ✅ Activated 1 terminal
5. ✅ Created a cashier user

---

## 🎯 Next Steps

### Step 1: Activate the Second Terminal

If you have 2 terminals but only 1 is active, activate the second one:

**Get the activation code for the inactive terminal:**
```bash
# List terminals to see activation codes
GET /api/auth/terminal/list?storeId=YOUR_STORE_ID
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Activate the terminal:**
```bash
POST /api/auth/terminal/activate
Content-Type: application/json

{
  "activationCode": "123456",  # From terminal registration response
  "macAddress": "00:1B:44:11:3A:B7",  # Terminal's MAC address
  "ipAddress": "192.168.1.100"  # Terminal's IP (optional)
}
```

**Response:**
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM002",
    "apiKey": "generated-api-key",
    "token": "jwt-token"
  }
}
```

**Save the `apiKey`** - you'll need it for terminal authentication.

---

### Step 2: Test Terminal Authentication

Test that your active terminal can authenticate:

```bash
POST /api/auth/terminal/authenticate
Content-Type: application/json

{
  "apiKey": "your-terminal-api-key",
  "macAddress": "00:1B:44:11:3A:B7",
  "ipAddress": "192.168.1.100"
}
```

**Expected Response:**
```json
{
  "success": true,
  "terminal": {
    "id": "terminal-uuid",
    "terminalCode": "TERM001",
    "store": { ... },
    "branch": { ... }
  },
  "token": "jwt-token-for-terminal"
}
```

---

### Step 3: Test User Login

Test logging in as the cashier user:

```bash
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "cashier-username",
  "password": "cashier-password"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "cashier",
    "email": "cashier@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CASHIER",
    "store": { ... }
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 28800
  },
  "permissions": ["sales:create", "sales:read", ...]
}
```

**Save the `accessToken`** for subsequent API calls.

---

### Step 4: Test Token Refresh

Test refreshing the access token:

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

---

### Step 5: Test User Management

**List all users in your store:**
```bash
GET /api/auth/user/list?storeId=YOUR_STORE_ID
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**List all terminals:**
```bash
GET /api/auth/terminal/list?storeId=YOUR_STORE_ID
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

### Step 6: Test Sync Functionality

If you have the sync module set up, test syncing data:

**Check sync status:**
```bash
GET /api/sync/status
Authorization: Bearer YOUR_TOKEN
```

**Trigger manual sync:**
```bash
POST /api/sync/trigger
Authorization: Bearer YOUR_TOKEN
```

---

### Step 7: Create Additional Users (Optional)

Create more users for different roles:

**Create Store Manager:**
```bash
POST /api/auth/user/create
Authorization: Bearer SUPER_ADMIN_TOKEN
Content-Type: application/json

{
  "storeId": "your-store-id",
  "username": "storemanager",
  "email": "manager@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Manager",
  "role": "STORE_MANAGER"
}
```

**Create Assistant Manager:**
```bash
POST /api/auth/user/create
Authorization: Bearer SUPER_ADMIN_TOKEN
Content-Type: application/json

{
  "storeId": "your-store-id",
  "username": "assistant",
  "email": "assistant@example.com",
  "password": "SecurePass123!",
  "firstName": "Bob",
  "lastName": "Assistant",
  "role": "ASSISTANT_MANAGER"
}
```

---

### Step 8: Test Password Change

Test that users can change their passwords:

```bash
POST /api/auth/user/change-password
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json

{
  "currentPassword": "old-password",
  "newPassword": "NewSecurePass123!"
}
```

---

### Step 9: Test Logout

Test logging out:

```bash
POST /api/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### Step 10: Test Password Reset Flow

**Request password reset:**
```bash
POST /api/auth/user/request-password-reset
Content-Type: application/json

{
  "email": "cashier@example.com"
}
```

Check the email for the reset link (if email service is configured).

---

## 🔍 Verification Checklist

Use this checklist to verify everything is working:

- [ ] Both terminals are activated
- [ ] Terminal authentication works
- [ ] User login works
- [ ] Token refresh works
- [ ] User listing works
- [ ] Terminal listing works
- [ ] Password change works
- [ ] Logout works
- [ ] Sync functionality works (if applicable)
- [ ] Email notifications are being sent (check email service)

---

## 🚀 Production Readiness

Before going to production:

1. **Security:**
   - [ ] Change default JWT secret
   - [ ] Enable HTTPS
   - [ ] Review and restrict CORS settings
   - [ ] Set up rate limiting
   - [ ] Enable audit logging

2. **Database:**
   - [ ] Set up database backups
   - [ ] Configure connection pooling
   - [ ] Set up monitoring

3. **Email:**
   - [ ] Configure production email service
   - [ ] Test all email templates
   - [ ] Set up email monitoring

4. **Monitoring:**
   - [ ] Set up error tracking
   - [ ] Configure logging
   - [ ] Set up health checks

---

## 📚 Additional Resources

- **API Documentation**: Visit `http://localhost:4000/api-docs` for Swagger UI
- **Quick Start Guide**: See `src/modules/auth/QUICK_START.md`
- **API Calls Reference**: See `API_CALLS.md`
- **User Experience Guide**: See `USER_EXPERIENCE.md`

---

## 🆘 Troubleshooting

### Terminal Won't Activate
- Check that activation code is correct (6 digits)
- Verify MAC address matches registration
- Check activation code hasn't expired (24 hours)

### User Can't Login
- Verify username and password are correct
- Check if account is locked (5 failed attempts)
- Verify user is active (`isActive: true`)

### Token Expired
- Use refresh token to get new access token
- If refresh token expired, user must login again

### Permission Denied
- Verify user has correct role
- Check user's `storeId` matches the resource
- Verify token is valid and not expired

---

## 🎉 You're Ready!

Once you've completed these steps, your authentication system is fully set up and ready for use!

