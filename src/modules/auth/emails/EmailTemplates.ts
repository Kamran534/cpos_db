/**
 * Email Templates for Authentication Module
 */

export class EmailTemplate {
  /**
   * Welcome email template
   */
  static welcomeEmail(data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    role: string;
    temporaryPassword?: string;
    mustChangePassword: boolean;
  }): string {
    const passwordSection = data.temporaryPassword
      ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Your Temporary Password:</p>
          <p style="margin: 10px 0; font-size: 18px; font-family: monospace; color: #007bff;">${data.temporaryPassword}</p>
          ${data.mustChangePassword ? '<p style="margin: 10px 0 0 0; color: #dc3545; font-weight: bold;">⚠️ You must change this password on first login.</p>' : ''}
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to POS System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Welcome to POS System</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello ${data.firstName} ${data.lastName},</p>
          
          <p>Your account has been created successfully!</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Account Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Username:</strong> ${data.username}</li>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Role:</strong> ${data.role}</li>
            </ul>
          </div>
          
          ${passwordSection}
          
          <p>You can now log in to the system using your credentials.</p>
          
          <p style="margin-top: 30px;">If you have any questions, please contact your system administrator.</p>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  static passwordResetEmail(data: {
    firstName: string;
    lastName: string;
    resetToken: string;
    resetUrl: string;
    expiresIn: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello ${data.firstName} ${data.lastName},</p>
          
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}?token=${data.resetToken}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${data.resetUrl}?token=${data.resetToken}</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link will expire in ${data.expiresIn}</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password will not change until you click the link above</li>
            </ul>
          </div>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password changed notification template
   */
  static passwordChangedEmail(data: {
    firstName: string;
    lastName: string;
    ipAddress: string;
    timestamp: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Password Changed Successfully</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello ${data.firstName} ${data.lastName},</p>
          
          <p>Your password has been changed successfully.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Change Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Time:</strong> ${data.timestamp}</li>
              <li><strong>IP Address:</strong> ${data.ipAddress}</li>
            </ul>
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <p style="margin: 0;"><strong>🔒 Security Notice:</strong></p>
            <p style="margin: 10px 0 0 0;">If you did not make this change, please contact your system administrator immediately.</p>
          </div>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Account locked notification template
   */
  static accountLockedEmail(data: {
    firstName: string;
    lastName: string;
    lockedUntil: string;
    unlockTime: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Locked</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Account Temporarily Locked</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello ${data.firstName} ${data.lastName},</p>
          
          <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="margin: 0;"><strong>⚠️ Account Status:</strong></p>
            <p style="margin: 10px 0 0 0;">Your account will be unlocked at: <strong>${data.unlockTime}</strong></p>
          </div>
          
          <p>For security reasons, your account has been locked for 30 minutes. You can try logging in again after this time period.</p>
          
          <p>If you believe this is an error or if you need immediate access, please contact your system administrator.</p>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Terminal activation email template
   */
  static terminalActivationEmail(data: {
    terminalCode: string;
    terminalName: string;
    activationCode: string;
    expiresAt: Date;
    storeName: string;
    branchName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terminal Activation Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Terminal Activation Code</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello,</p>
          
          <p>A new terminal has been registered and requires activation.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Terminal Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Terminal Code:</strong> ${data.terminalCode}</li>
              <li><strong>Terminal Name:</strong> ${data.terminalName}</li>
              <li><strong>Store:</strong> ${data.storeName}</li>
              <li><strong>Branch:</strong> ${data.branchName}</li>
            </ul>
          </div>
          
          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; border: 2px solid #007bff;">
            <p style="margin: 0; font-weight: bold; font-size: 14px;">ACTIVATION CODE</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; font-family: monospace;">
              ${data.activationCode}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">
              Expires: ${data.expiresAt.toLocaleString()}
            </p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code will expire in 24 hours</li>
              <li>Use this code on the terminal to complete activation</li>
              <li>Keep this code secure and do not share it</li>
            </ul>
          </div>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Terminal activated notification template
   */
  static terminalActivatedEmail(data: {
    terminalCode: string;
    terminalName: string;
    activatedAt: Date;
    storeName: string;
    branchName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terminal Activated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">Terminal Activated Successfully</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello,</p>
          
          <p>The terminal has been successfully activated.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Terminal Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Terminal Code:</strong> ${data.terminalCode}</li>
              <li><strong>Terminal Name:</strong> ${data.terminalName}</li>
              <li><strong>Store:</strong> ${data.storeName}</li>
              <li><strong>Branch:</strong> ${data.branchName}</li>
              <li><strong>Activated At:</strong> ${data.activatedAt.toLocaleString()}</li>
            </ul>
          </div>
          
          <p>The terminal is now active and ready to use.</p>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Security alert template
   */
  static securityAlert(data: {
    firstName: string;
    lastName: string;
    alertType: string;
    details: any;
    timestamp: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">🔒 Security Alert</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello ${data.firstName} ${data.lastName},</p>
          
          <p>We detected a security event on your account:</p>
          
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="margin: 0;"><strong>Alert Type:</strong> ${data.alertType}</p>
            <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${data.timestamp}</p>
            ${data.details ? `<p style="margin: 10px 0 0 0;"><strong>Details:</strong> ${JSON.stringify(data.details)}</p>` : ''}
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <p style="margin: 0;"><strong>⚠️ What to do:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>If this was you, no action is needed</li>
              <li>If this was not you, change your password immediately</li>
              <li>Contact your system administrator if you have concerns</li>
            </ul>
          </div>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Store registration email template
   */
  static storeRegistrationEmail(data: {
    storeName: string;
    storeCode: string;
    email: string;
    registeredBy: string;
    registeredAt: string;
    storeDetails?: {
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
    };
  }): string {
    const addressSection = data.storeDetails?.addressLine1
      ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Store Address:</strong></p>
          <p style="margin: 10px 0 0 0;">
            ${data.storeDetails.addressLine1}<br>
            ${data.storeDetails.city ? `${data.storeDetails.city}, ` : ''}${data.storeDetails.state || ''} ${data.storeDetails.zipCode || ''}
          </p>
          ${data.storeDetails.phone ? `<p style="margin: 10px 0 0 0;"><strong>Phone:</strong> ${data.storeDetails.phone}</p>` : ''}
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Store Registration Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">✅ Store Registration Confirmed</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
          <p>Hello,</p>
          
          <p>Your store has been successfully registered in the POS System!</p>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0;"><strong>Store Information:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Store Name:</strong> ${data.storeName}</li>
              <li><strong>Store Code:</strong> ${data.storeCode}</li>
              <li><strong>Registered By:</strong> ${data.registeredBy}</li>
              <li><strong>Registration Date:</strong> ${data.registeredAt}</li>
            </ul>
          </div>
          
          ${addressSection}
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <p style="margin: 0;"><strong>📋 Next Steps:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Your store is now active in the system</li>
              <li>You can start registering branches and terminals</li>
              <li>Contact your system administrator for access credentials</li>
            </ul>
          </div>
          
          <p>If you have any questions or need assistance, please contact your system administrator.</p>
          
          <p>Best regards,<br>POS System Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }
}

