const { z } = require('zod');

const email = z.string().email();
const password = z.string().min(Number(process.env.PASSWORD_MIN_LENGTH || 8));
const code = z.string().min(4).max(10);
const purpose = z.enum(['register', 'reset']).optional().default('register');

const registerSchema = z.object({
  body: z.object({
    email,
    password,
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    store_id: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const verifyOtpSchema = z.object({
  body: z.object({ email, code, purpose }),
});

const resendOtpSchema = z.object({
  body: z.object({ email, purpose }),
});

const loginSchema = z.object({
  body: z.object({ email, password }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email }),
});

const resetPasswordSchema = z.object({
  body: z.object({ email, code, new_password: password }),
});

module.exports = {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};


