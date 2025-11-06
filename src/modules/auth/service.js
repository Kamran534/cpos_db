const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { signJwt } = require('../../lib/jwt');
const { remoteDb } = require('../../lib/db');
const { sendMail } = require('../../lib/mailer');
const { otpHtml, otpText } = require('./emails/otp');
const { welcomeHtml, welcomeText } = require('./emails/welcome');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 8);

function generateOtp() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

function errorRes(res, status, code, message, context) {
  return res.status(status).json({ error: { code, message, context } });
}

async function registerController(req, res, next) {
  try {
    const { email, password, first_name, last_name, store_id } = req.body || {};
    if (!email || !password) return errorRes(res, 400, 'VALIDATION_ERROR', 'Email and password required');
    if (password.length < PASSWORD_MIN_LENGTH) return errorRes(res, 400, 'WEAK_PASSWORD', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    const exists = await remoteDb.users.findUnique({ where: { email } });
    if (exists) return errorRes(res, 409, 'EMAIL_EXISTS', 'Email already registered');
    const id = 'user_' + randomBytes(6).toString('hex');
    const password_hash = await bcrypt.hash(password, 10);
    await remoteDb.users.create({ data: { id, email, username: email, password_hash, first_name, last_name, role: 'cashier', is_active: false, store_id } });
    await issueAndSendOtp({ email, user_id: id, purpose: 'register' });
    res.status(201).json({ message: 'Registered. Verification code sent to email.' });
  } catch (e) { next(e); }
}

async function issueAndSendOtp({ email, user_id, purpose }) {
  const code = generateOtp();
  const expires_at = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
  await remoteDb.email_otps.create({ data: { id: 'otp_' + randomBytes(6).toString('hex'), user_id, email, code, purpose, expires_at } });
  await sendMail({ to: email, subject: `Your ${purpose === 'reset' ? 'reset' : 'verification'} code`, text: otpText({ code, minutes: OTP_EXPIRE_MINUTES }), html: otpHtml({ code, minutes: OTP_EXPIRE_MINUTES }) });
}

async function resendOtpController(req, res, next) {
  try {
    const { email, purpose = 'register' } = req.body || {};
    if (!email) return errorRes(res, 400, 'VALIDATION_ERROR', 'Email required');
    const user = await remoteDb.users.findUnique({ where: { email } });
    if (!user) return errorRes(res, 404, 'USER_NOT_FOUND', 'User not found');
    await issueAndSendOtp({ email, user_id: user.id, purpose });
    res.status(202).json({ message: 'OTP resent.' });
  } catch (e) { next(e); }
}

async function verifyOtpController(req, res, next) {
  try {
    const { email, code, purpose = 'register' } = req.body || {};
    if (!email || !code) return errorRes(res, 400, 'VALIDATION_ERROR', 'Email and code required');
    const otp = await remoteDb.email_otps.findFirst({ where: { email, code, purpose, consumed_at: null }, orderBy: { created_at: 'desc' } });
    if (!otp) return errorRes(res, 400, 'INVALID_CODE', 'Invalid code');
    if (otp.expires_at < new Date()) return errorRes(res, 400, 'CODE_EXPIRED', 'Code expired');
    await remoteDb.email_otps.update({ where: { id: otp.id }, data: { consumed_at: new Date() } });
    if (purpose === 'register') {
      const user = await remoteDb.users.update({ where: { email }, data: { is_active: true } });
      await sendMail({ to: email, subject: 'Welcome!', text: welcomeText({ firstName: user.first_name }), html: welcomeHtml({ firstName: user.first_name }) });
    }
    res.json({ message: 'Verified.' });
  } catch (e) { next(e); }
}

async function loginController(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return errorRes(res, 400, 'VALIDATION_ERROR', 'Missing credentials');
    const user = await remoteDb.users.findUnique({ where: { email } });
    if (!user || user.is_active === false) return errorRes(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) return errorRes(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    const token = signJwt({ sub: user.id, role: user.role, store_id: user.store_id, email: user.email });
    res.json({ token });
  } catch (e) { next(e); }
}

async function forgotPasswordController(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) return errorRes(res, 400, 'VALIDATION_ERROR', 'Email required');
    const user = await remoteDb.users.findUnique({ where: { email } });
    if (user) await issueAndSendOtp({ email, user_id: user.id, purpose: 'reset' });
    res.json({ message: 'If the email exists, a reset code has been sent.' });
  } catch (e) { next(e); }
}

async function resetPasswordController(req, res, next) {
  try {
    const { email, code, new_password } = req.body || {};
    if (!email || !code || !new_password) return errorRes(res, 400, 'VALIDATION_ERROR', 'Email, code and new_password required');
    if (new_password.length < PASSWORD_MIN_LENGTH) return errorRes(res, 400, 'WEAK_PASSWORD', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    const otp = await remoteDb.email_otps.findFirst({ where: { email, code, purpose: 'reset', consumed_at: null }, orderBy: { created_at: 'desc' } });
    if (!otp) return errorRes(res, 400, 'INVALID_CODE', 'Invalid code');
    if (otp.expires_at < new Date()) return errorRes(res, 400, 'CODE_EXPIRED', 'Code expired');
    const password_hash = await bcrypt.hash(new_password, 10);
    await remoteDb.users.update({ where: { email }, data: { password_hash } });
    await remoteDb.email_otps.update({ where: { id: otp.id }, data: { consumed_at: new Date() } });
    res.json({ message: 'Password reset successful.' });
  } catch (e) { next(e); }
}

async function meController(req, res) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await remoteDb.users.findUnique({ where: { id: userId }, select: { id: true, email: true, first_name: true, last_name: true, role: true, store_id: true } });
  res.json(user);
}

module.exports = { registerController, resendOtpController, verifyOtpController, loginController, forgotPasswordController, resetPasswordController, meController };


