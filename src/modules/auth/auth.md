# Auth Module - Checklist & Notes

## Checklist (Done)
- Email-driven auth (unique, required `users.email`)
- OTP flow using `email_otps` (register, reset)
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

## Database Changes
- `users.email` set to required + unique
- New table: `email_otps` (id, user_id, email, code, purpose, expires_at, consumed_at, created_at)

## Configuration (.env)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your@gmail.com
OTP_EXPIRE_MINUTES=10
PASSWORD_MIN_LENGTH=8
JWT_SECRET=your_generated_secret
```

## Testing Checklist
- Register → OTP email received → Verify → Login
- Resend OTP throttling (manual for now; see TODO)
- Forgot password → Reset OTP → Reset password → Login
- `GET /api/auth/me` with valid/invalid JWT

## Known Issues / TODOs
- Add rate limiting for login, register, resend-otp (prevent abuse)
- Add resend-otp throttling per email (e.g., 1/min, 5/hour)
- Account lockout after N failed logins (temporary)
- Optional: password complexity policy & breach password check
- Optional: email branding/templates (HTML/CSS)
- Optional: roles/permissions middleware (RBAC)
- Optional: audit log entries for auth flows
- Optional: i18n for email content and API messages

## Notes
- OTPs expire after `OTP_EXPIRE_MINUTES`; consumed codes cannot be reused.
- For Gmail, use an App Password (2FA required).
