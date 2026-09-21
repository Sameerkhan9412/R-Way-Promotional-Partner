import nodemailer, { type SendMailOptions } from 'nodemailer';

interface SendResetEmailOptions {
  to: string;
  resetUrl: string;
  adminName?: string;
}

/**
 * Creates and returns a Nodemailer transporter based on .env configuration.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback transporter: Logs to console if SMTP credentials are not configured yet
  return {
    sendMail: async (options: SendMailOptions) => {
      console.log('====================================================');
      console.log(' [MAIL MOCK/DEBUG] SMTP credentials not set in .env');
      console.log(` To: ${options.to}`);
      console.log(` Subject: ${options.subject}`);
      console.log(` Reset URL: ${(options as any).resetUrl || 'See HTML body'}`);
      console.log('====================================================');
      return { messageId: `mock_${Date.now()}` };
    },
  };
}

/**
 * Sends a password reset email to the admin with a direct reset link.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  adminName = 'Administrator',
}: SendResetEmailOptions) {
  const from = process.env.SMTP_FROM || `RWAY Admin <noreply@rwaypromotion.com>`;
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your RWAY Admin Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px;
      color: #1e293b;
    }
    .email-container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #ccfbf1;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 17px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn-reset {
      display: inline-block;
      background-color: #0d9488;
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 30px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
    }
    .link-fallback {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
    }
    .link-fallback a {
      color: #0d9488;
      text-decoration: underline;
    }
    .security-notice {
      margin-top: 24px;
      padding: 14px 16px;
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      font-size: 12px;
      color: #92400e;
      line-height: 1.5;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>RWAY PROMOTION PARTNERS</h1>
      <p>Secure Admin Portal Authorization</p>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${adminName},</div>
      
      <p class="message">
        We received a request to reset the password for your <strong>RWAY Promotion Partners</strong> admin account.
      </p>

      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn-reset">Reset Admin Password</a>
      </div>

      <p class="message" style="font-size: 13px; margin-bottom: 0;">
        This password reset link will expire in <strong>1 hour</strong>. For security reasons, the link can only be used once.
      </p>

      <div class="security-notice">
        <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your current password remains secure and will not change.
      </div>

      <div class="link-fallback">
        If the button above does not work, copy and paste this link into your web browser:<br>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      </div>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} RWAY Promotion Partners. All rights reserved.<br>
      This is an automated system email. Please do not reply directly.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
RWAY PROMOTION PARTNERS - ADMIN PASSWORD RESET

Hello ${adminName},

We received a request to reset the password for your RWAY Promotion Partners admin account.

To reset your password, visit the following URL in your browser:
${resetUrl}

This link is valid for 1 hour and can only be used once.

Security Notice: If you did not make this request, please ignore this email. Your account password remains unchanged.
  `.trim();

  const mailOptions: any = {
    from,
    to,
    subject: 'Password Reset Request - RWAY Promotion Partners',
    text: textContent,
    html: htmlContent,
    resetUrl,
  };

  const result = await (transporter as any).sendMail(mailOptions);
  return { success: true, messageId: result?.messageId };
}
