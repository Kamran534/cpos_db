import { sendMail } from '../../../lib/mailer.js';
import { EmailTemplate } from './EmailTemplates.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.MAIL_FROM || 'no-reply@example.com';
    this.fromName = process.env.MAIL_FROM_NAME || 'POS System';
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html)
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw - email failures shouldn't break the flow
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: any, temporaryPassword?: string): Promise<void> {
    const html = EmailTemplate.welcomeEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      temporaryPassword,
      mustChangePassword: user.mustChangePassword || false
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to POS System',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: any, resetToken: string, resetUrl: string): Promise<void> {
    const html = EmailTemplate.passwordResetEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      resetToken,
      resetUrl,
      expiresIn: '1 hour'
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html
    });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(user: any, ipAddress?: string): Promise<void> {
    const html = EmailTemplate.passwordChangedEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      ipAddress: ipAddress || 'Unknown',
      timestamp: new Date().toLocaleString()
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Password Changed',
      html
    });
  }

  /**
   * Send account locked notification
   */
  async sendAccountLockedEmail(user: any, lockedUntil: Date): Promise<void> {
    const html = EmailTemplate.accountLockedEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      lockedUntil: lockedUntil.toLocaleString(),
      unlockTime: lockedUntil.toLocaleString()
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Account Temporarily Locked',
      html
    });
  }

  /**
   * Send terminal activation email to admin
   */
  async sendTerminalActivationEmail(adminEmail: string, terminalData: {
    terminalCode: string;
    terminalName: string;
    activationCode: string;
    expiresAt: Date;
    storeName: string;
    branchName: string;
  }): Promise<void> {
    const html = EmailTemplate.terminalActivationEmail(terminalData);

    await this.sendEmail({
      to: adminEmail,
      subject: `Terminal Activation Code: ${terminalData.terminalCode}`,
      html
    });
  }

  /**
   * Send terminal activated notification
   */
  async sendTerminalActivatedEmail(adminEmail: string, terminalData: {
    terminalCode: string;
    terminalName: string;
    activatedAt: Date;
    storeName: string;
    branchName: string;
  }): Promise<void> {
    const html = EmailTemplate.terminalActivatedEmail(terminalData);

    await this.sendEmail({
      to: adminEmail,
      subject: `Terminal Activated: ${terminalData.terminalCode}`,
      html
    });
  }

  /**
   * Send store registration confirmation email
   */
  async sendStoreRegistrationEmail(
    storeEmail: string,
    storeData: {
      storeName: string;
      storeCode: string;
      registeredBy: string;
      registeredAt: Date;
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
    }
  ): Promise<void> {
    const html = EmailTemplate.storeRegistrationEmail({
      storeName: storeData.storeName,
      storeCode: storeData.storeCode,
      email: storeEmail,
      registeredBy: storeData.registeredBy,
      registeredAt: storeData.registeredAt.toLocaleString(),
      storeDetails: {
        addressLine1: storeData.addressLine1,
        city: storeData.city,
        state: storeData.state,
        zipCode: storeData.zipCode,
        phone: storeData.phone
      }
    });

    await this.sendEmail({
      to: storeEmail,
      subject: `Store Registration Confirmation - ${storeData.storeName}`,
      html
    });
  }

  /**
   * Send security alert (failed login attempts, etc.)
   */
  async sendSecurityAlert(user: any, alertType: string, details: any): Promise<void> {
    const html = EmailTemplate.securityAlert({
      firstName: user.firstName,
      lastName: user.lastName,
      alertType,
      details,
      timestamp: new Date().toLocaleString()
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Security Alert',
      html
    });
  }

  /**
   * Convert HTML to plain text (simple version)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

