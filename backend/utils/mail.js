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

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
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

module.exports = {
  sendMail,
};
