const { z } = require('zod');

const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 8);

const emailSchema = z.string().email({ message: 'Invalid email format' });
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

const codeSchema = z.string().length(6, { message: 'OTP code must be 6 digits' }).regex(/^\d+$/, { message: 'OTP code must contain only digits' });
const purposeSchema = z.enum(['register', 'reset'], { errorMap: () => ({ message: 'Purpose must be either "register" or "reset"' }) }).optional().default('register');

const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(50, { message: 'Username must be at most 50 characters' })
  .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' });

const roleSchema = z.enum(['SUPER_ADMIN', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'CUSTOMER_SERVICE'], {
  errorMap: () => ({ message: 'Invalid role' }),
}).optional();

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  .optional()
  .nullable();

const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, { message: 'First name is required' }).max(100, { message: 'First name is too long' }),
    lastName: z.string().min(1, { message: 'Last name is required' }).max(100, { message: 'Last name is too long' }),
    phone: phoneSchema,
    username: usernameSchema.optional(),
    role: roleSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: codeSchema,
    purpose: purposeSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const resendOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    purpose: purposeSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, { message: 'Password is required' }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: codeSchema,
    newPassword: passwordSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
