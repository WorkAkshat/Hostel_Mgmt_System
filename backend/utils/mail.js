const nodemailer = require('nodemailer');

/**
 * Send an email using Nodemailer.
 * Falls back to logging to console if SMTP env is not configured.
 */
const sendMail = async ({ to, subject, text, html }) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('\n=================== SIMULATED SMTP EMAIL ===================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------------------------');
    console.log(text);
    console.log('============================================================\n');
    return { simulated: true, success: true };
  }

  const portNum = parseInt(port, 10);
  const isSecure = portNum === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"Hari Pushp PG" <${user}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    throw error;
  }
};

/**
 * Generate high-end HTML email template for Password Reset Code
 */
const buildResetPasswordEmail = ({ name, resetCode }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hari Pushp PG — Password Reset Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 36px 30px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Logo Icon Badge -->
                    <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 16px; color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                      🏠
                    </div>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Hari Pushp PG</h1>
                    <p style="color: #a5b4fc; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 6px 0 0 0;">Hostel Management Security</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 30px; text-align: left;">
              <h2 style="color: #0f172a; font-size: 19px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.3px;">Password Reset Request</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello <strong>${name}</strong>,<br>
                We received a request to reset the password for your Hari Pushp PG account. Use the 6-digit verification code below to authorize your password update.
              </p>

              <!-- OTP Verification Code Badge -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 24px 16px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #1e40af; letter-spacing: 10px; padding: 12px 20px; background: #ffffff; border-radius: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.08); border: 1px solid #e0e7ff;">
                      ${resetCode}
                    </div>
                    <span style="font-size: 12px; font-weight: 600; color: #6366f1; display: block; margin-top: 10px;">⏱️ Code expires in 60 minutes</span>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="color: #991b1b; font-size: 12px; line-height: 1.5; margin: 0;">
                      <strong>🔒 Security Tip:</strong> If you did not request this password reset, please ignore this email or contact your hostel warden immediately. Never share your verification code with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                Warm regards,<br>
                <strong>Hari Pushp PG Administration Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                &copy; 2026 Hari Pushp PG Girls Hostel &bull; Official Management System<br>
                This is an automated operational security message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

module.exports = {
  sendMail,
  buildResetPasswordEmail,
};
