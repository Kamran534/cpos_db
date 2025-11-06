const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { signJwt } = require('../../lib/jwt');
const { remoteDb } = require('../../lib/db');
const { sendMail } = require('../../lib/mailer');
const { otpHtml, otpText } = require('./emails/otp');
const { welcomeHtml, welcomeText } = require('./emails/welcome');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 8);

// In-memory OTP storage
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateOtpKey(email, purpose) {
  return `${email}:${purpose}`;
}

function storeOtp(email, purpose, code) {
  const key = generateOtpKey(email, purpose);
  const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
  otpStore.set(key, { code, expiresAt, attempts: 0 });
  // Clean up expired OTPs after expiry
  setTimeout(() => otpStore.delete(key), OTP_EXPIRE_MINUTES * 60 * 1000);
}

function getOtp(email, purpose) {
  const key = generateOtpKey(email, purpose);
  return otpStore.get(key);
}

function consumeOtp(email, purpose) {
  const key = generateOtpKey(email, purpose);
  otpStore.delete(key);
}

function errorRes(res, status, code, message, context) {
  return res.status(status).json({ error: { code, message, context } });
}

async function registerController(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone, username, role } = req.body || {};
    
    // Validation
    if (!email || !password) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email and password are required');
    }
    
    if (password.length < PASSWORD_MIN_LENGTH) {
      return errorRes(res, 400, 'WEAK_PASSWORD', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    
    if (!firstName || !lastName) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'First name and last name are required');
    }
    
    // Always auto-create a Store (storeId is system-generated)
    const storeCode = 'store_' + randomBytes(4).toString('hex');
    const storeName = (firstName && lastName)
      ? `${firstName} ${lastName}`
      : (firstName || lastName || (email ? email.split('@')[0] : 'New'));
    const createdStore = await remoteDb.store.create({
      data: {
        storeCode,
        storeName,
        email: email || null,
      }
    });
    const resolvedStoreId = createdStore.id;
    
    // Check for duplicate email
    const existingByEmail = await remoteDb.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return errorRes(res, 409, 'EMAIL_EXISTS', 'Email is already registered');
    }
    
    // Generate username if not provided
    const finalUsername = username || email.split('@')[0] + '_' + randomBytes(4).toString('hex');
    
    // Check for duplicate username
    const existingByUsername = await remoteDb.user.findUnique({ where: { username: finalUsername } });
    if (existingByUsername) {
      return errorRes(res, 409, 'USERNAME_EXISTS', 'Username is already taken');
    }
    
    // Validate role
    const validRoles = ['SUPER_ADMIN', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'CUSTOMER_SERVICE'];
    const finalRole = role && validRoles.includes(role) ? role : 'CASHIER';
    
    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await remoteDb.user.create({
      data: {
        email,
        username: finalUsername,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        storeId: resolvedStoreId,
        role: finalRole,
        isActive: false, // Requires OTP verification
        permissions: [],
      },
    });
    
    // Send OTP
    await issueAndSendOtp({ email, userId: user.id, purpose: 'register' });
    
    res.status(201).json({
      message: 'Registration successful. Verification code sent to email.',
      userId: user.id,
    });
  } catch (e) {
    // Handle Prisma unique constraint errors
    if (e.code === 'P2002') {
      const field = e.meta?.target?.[0];
      if (field === 'email') {
        return errorRes(res, 409, 'EMAIL_EXISTS', 'Email is already registered');
      }
      if (field === 'username') {
        return errorRes(res, 409, 'USERNAME_EXISTS', 'Username is already taken');
      }
      return errorRes(res, 409, 'DUPLICATE_ENTRY', 'Duplicate entry detected');
    }
    next(e);
  }
}

async function issueAndSendOtp({ email, userId, purpose }) {
  const code = generateOtp();
  storeOtp(email, purpose, code);
  
  await sendMail({
    to: email,
    subject: `Your ${purpose === 'reset' ? 'password reset' : 'verification'} code`,
    text: otpText({ code, minutes: OTP_EXPIRE_MINUTES }),
    html: otpHtml({ code, minutes: OTP_EXPIRE_MINUTES }),
  });
}

async function resendOtpController(req, res, next) {
  try {
    const { email, purpose = 'register' } = req.body || {};
    if (!email) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email is required');
    }
    
    const user = await remoteDb.user.findUnique({ where: { email } });
    if (!user) {
      return errorRes(res, 404, 'USER_NOT_FOUND', 'User not found');
    }
    
    // Check if user is already verified (for register purpose)
    if (purpose === 'register' && user.isActive) {
      return errorRes(res, 400, 'ALREADY_VERIFIED', 'User is already verified');
    }
    
    await issueAndSendOtp({ email, userId: user.id, purpose });
    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (e) {
    next(e);
  }
}

async function verifyOtpController(req, res, next) {
  try {
    const { email, code, purpose = 'register' } = req.body || {};
    if (!email || !code) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email and code are required');
    }
    
    const storedOtp = getOtp(email, purpose);
    if (!storedOtp) {
      return errorRes(res, 400, 'INVALID_CODE', 'Invalid or expired code');
    }
    
    if (new Date() > storedOtp.expiresAt) {
      consumeOtp(email, purpose);
      return errorRes(res, 400, 'CODE_EXPIRED', 'Code has expired');
    }
    
    if (storedOtp.code !== code) {
      storedOtp.attempts++;
      if (storedOtp.attempts >= 3) {
        consumeOtp(email, purpose);
        return errorRes(res, 400, 'MAX_ATTEMPTS', 'Maximum attempts exceeded. Please request a new code.');
      }
      return errorRes(res, 400, 'INVALID_CODE', `Invalid code. ${3 - storedOtp.attempts} attempts remaining.`);
    }
    
    // Consume OTP after successful verification
    consumeOtp(email, purpose);
    
    if (purpose === 'register') {
      const user = await remoteDb.user.update({
        where: { email },
        data: { isActive: true },
      });
      await sendMail({
        to: email,
        subject: 'Welcome!',
        text: welcomeText({ firstName: user.firstName }),
        html: welcomeHtml({ firstName: user.firstName }),
      });
    }
    
    res.json({ message: 'Verification successful' });
  } catch (e) {
    next(e);
  }
}

const { triggerNow: triggerSyncNow } = require('../sync/cron');

async function loginController(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    // Ensure remote DB client is initialized with User delegate
    if (!remoteDb || !remoteDb.user) {
      return errorRes(res, 500, 'DB_NOT_READY', 'Database client not initialized. Please regenerate Prisma client and restart the server.');
    }
    
    const user = await remoteDb.user.findUnique({ where: { email } });
    if (!user) {
      return errorRes(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));
      return errorRes(res, 423, 'ACCOUNT_LOCKED', `Account is locked. Try again in ${minutesLeft} minute(s).`);
    }
    
    // Check if account is active
    if (!user.isActive) {
      return errorRes(res, 403, 'ACCOUNT_INACTIVE', 'Account is not verified. Please verify your email first.');
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // Increment login attempts
      const loginAttempts = user.loginAttempts + 1;
      const lockMinutes = loginAttempts >= 5 ? 30 : 0;
      const lockedUntil = lockMinutes > 0 ? new Date(Date.now() + lockMinutes * 60 * 1000) : null;
      
      await remoteDb.user.update({
        where: { id: user.id },
        data: {
          loginAttempts,
          lockedUntil,
        },
      });
      
      return errorRes(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Reset login attempts and update last login
    await remoteDb.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    
    const token = signJwt({
      sub: user.id,
      role: user.role,
      storeId: user.storeId,
      email: user.email,
    });
    
    // Fire-and-forget sync trigger on login
    triggerSyncNow().catch(err => console.error('[sync-trigger] Failed:', err.message));
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        storeId: user.storeId,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function forgotPasswordController(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email is required');
    }
    
    const user = await remoteDb.user.findUnique({ where: { email } });
    if (user) {
      await issueAndSendOtp({ email, userId: user.id, purpose: 'reset' });
    }
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a password reset code has been sent.' });
  } catch (e) {
    next(e);
  }
}

async function resetPasswordController(req, res, next) {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return errorRes(res, 400, 'VALIDATION_ERROR', 'Email, code, and newPassword are required');
    }
    
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return errorRes(res, 400, 'WEAK_PASSWORD', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    
    const storedOtp = getOtp(email, 'reset');
    if (!storedOtp) {
      return errorRes(res, 400, 'INVALID_CODE', 'Invalid or expired code');
    }
    
    if (new Date() > storedOtp.expiresAt) {
      consumeOtp(email, 'reset');
      return errorRes(res, 400, 'CODE_EXPIRED', 'Code has expired');
    }
    
    if (storedOtp.code !== code) {
      storedOtp.attempts++;
      if (storedOtp.attempts >= 3) {
        consumeOtp(email, 'reset');
        return errorRes(res, 400, 'MAX_ATTEMPTS', 'Maximum attempts exceeded. Please request a new code.');
      }
      return errorRes(res, 400, 'INVALID_CODE', `Invalid code. ${3 - storedOtp.attempts} attempts remaining.`);
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await remoteDb.user.update({
      where: { email },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });
    
    consumeOtp(email, 'reset');
    res.json({ message: 'Password reset successful' });
  } catch (e) {
    next(e);
  }
}

async function meController(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    
    const user = await remoteDb.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        storeId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    
    res.json(user);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  registerController,
  resendOtpController,
  verifyOtpController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  meController,
};
