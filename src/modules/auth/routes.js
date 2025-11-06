const { Router } = require('express');
const { requireAuth } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validate');
const { registerSchema, verifyOtpSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('./validation');
const { registerController, resendOtpController, verifyOtpController, loginController, forgotPasswordController, resetPasswordController, meController } = require('./service');
const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register user with email + password; sends verification OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               store_id: { type: string }
 *           example:
 *             email: user@example.com
 *             password: Secret123!
 *             first_name: Jane
 *             last_name: Doe
 *             store_id: store_001
 *     responses:
 *       201:
 *         description: Created and OTP sent
 *       409:
 *         description: Email already registered
 */
router.post('/register', validate(registerSchema), registerController);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and activate user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string }
 *               purpose: { type: string, enum: [register, reset], default: register }
 *           example:
 *             email: user@example.com
 *             code: "123456"
 *             purpose: register
 *     responses:
 *       200: { description: Verified }
 *       400: { description: Invalid or expired code }
 */
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtpController);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               purpose: { type: string, enum: [register, reset], default: register }
 *           example:
 *             email: user@example.com
 *             purpose: register
 *     responses:
 *       200: { description: OTP resent }
 */
router.post('/resend-otp', validate(resendOtpSchema), resendOtpController);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *           example:
 *             email: user@example.com
 *             password: Secret123!
 *     responses:
 *       200:
 *         description: JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginSchema), loginController);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send reset OTP to email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *           example:
 *             email: user@example.com
 *     responses:
 *       200: { description: OTP sent (if user exists) }
 */
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordController);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, new_password]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string }
 *               new_password: { type: string, minLength: 8 }
 *           example:
 *             email: user@example.com
 *             code: "123456"
 *             new_password: NewSecret123!
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired code }
 */
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordController);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 first_name: { type: string }
 *                 last_name: { type: string }
 *                 role: { type: string }
 *                 store_id: { type: string }
 *       401: { description: Unauthorized }
 */
router.get('/me', requireAuth, meController);

module.exports = router;


