import nodemailer, { Transporter } from 'nodemailer';

export const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendMail(opts: Parameters<Transporter['sendMail']>[0]) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    ...opts,
  });
}


