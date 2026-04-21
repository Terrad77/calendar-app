import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<void> {
  if (!isSmtpConfigured || !transporter) {
    console.warn(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to send real emails.'
    );
    console.log('\n--- Verification Email (Fallback Log) ---');
    console.log(`To: ${email}`);
    console.log(`Link: ${verificationLink}`);
    console.log('-----------------------------------------\n');
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Confirm your registration',
    text: `Welcome! Confirm your email by opening this link: ${verificationLink}`,
    html: `<p>Welcome!</p><p>Confirm your email by opening this link:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`,
  });
}
