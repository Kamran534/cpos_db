# Auth Module - Checklist & Notes

## Checklist (Done)
- Email-driven auth (unique, required `User.email`)
- OTP flow using in-memory OTP storage (register, reset)
- Controllers and routes
  - POST `/api/auth/register`
  - POST `/api/auth/verify-otp`
  - POST `/api/auth/resend-otp`
  - POST `/api/auth/login`
  - POST `/api/auth/forgot-password`
  - POST `/api/auth/reset-password`
  - GET `/api/auth/me` (JWT)
- Nodemailer integration (SMTP env-based)
- Email templates
  - OTP: `src/modules/auth/emails/otp.js`
  - Welcome: `src/modules/auth/emails/welcome.js`
- Input validation with Zod schemas
- Consistent error responses with proper HTTP status codes
- Swagger docs for all endpoints
- Duplicate registration prevention (email, username)
- Store validation (requires valid storeId)
- Account locking after failed login attempts
- Password complexity validation
- Automatic sync trigger on login

## Database Schema
- Uses `User` model from `prisma/schema.prisma`
- Fields: `id`, `storeId`, `username` (unique), `email` (unique), `passwordHash`, `firstName`, `lastName`, `phone`, `role`, `permissions`, `isActive`, `lastLoginAt`, `loginAttempts`, `lockedUntil`
- UserRole enum: `SUPER_ADMIN`, `STORE_MANAGER`, `ASSISTANT_MANAGER`, `CASHIER`, `INVENTORY_MANAGER`, `CUSTOMER_SERVICE`

## Configuration (.env)
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your@gmail.com

# OTP Configuration
OTP_EXPIRE_MINUTES=10

# Password Configuration
PASSWORD_MIN_LENGTH=8

# JWT Configuration
JWT_SECRET=your_generated_secret
JWT_EXPIRES_IN=7d

# Database
POSTGRES_URL_REMOTE=postgresql://user:password@host:5432/database
```

## Testing Checklist
- Register → OTP email received → Verify → Login
- Resend OTP functionality
- Forgot password → Reset OTP → Reset password → Login
- `GET /api/auth/me` with valid/invalid JWT
- Duplicate email registration (should fail with 409)
- Duplicate username registration (should fail with 409)
- Invalid storeId registration (should fail with 404)
- Account lockout after 5 failed login attempts
- Password complexity validation

## Known Issues / TODOs
- Add rate limiting for login, register, resend-otp (prevent abuse)
- Add resend-otp throttling per email (e.g., 1/min, 5/hour)
- Optional: password complexity policy & breach password check
- Optional: email branding/templates (HTML/CSS)
- Optional: roles/permissions middleware (RBAC)
- Optional: audit log entries for auth flows
- Optional: i18n for email content and API messages
- Optional: Migrate OTP storage from in-memory to database

## Notes
- OTPs expire after `OTP_EXPIRE_MINUTES`; consumed codes cannot be reused.
- For Gmail, use an App Password (2FA required).
- Account locks for 30 minutes after 5 failed login attempts.
- Username is auto-generated from email if not provided.
- Store ID must exist in the database before user registration.
- Automatic sync is triggered on successful login (fire-and-forget).
