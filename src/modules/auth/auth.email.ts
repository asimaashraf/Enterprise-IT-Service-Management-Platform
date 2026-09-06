import { emailQueue } from "../../jobs/queues/email.queue";

/**
 * Branded email templates for the authentication lifecycle.
 * Plain HTML with inline styles; no external dependencies.
 */

const PRODUCT_NAME = "ITSM Platform";

const baseTemplate = (content: string): string => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 0 24px;">
                <div style="display:inline-flex;align-items:center;gap:8px;">
                  <div style="width:32px;height:32px;background:#4f46e5;color:#ffffff;font-weight:700;font-size:13px;border-radius:6px;display:flex;align-items:center;justify-content:center;letter-spacing:0.5px;">IT</div>
                  <div style="font-weight:600;font-size:14px;color:#18181b;">${PRODUCT_NAME}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px 24px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px;border-top:1px solid #e4e4e7;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#71717a;">
                  If you did not request this email you can safely ignore it.
                  This link will expire automatically.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;color:#a1a1aa;">&copy; ${PRODUCT_NAME}</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const verificationEmailTemplate = (
  fullName: string,
  verifyUrl: string
): { subject: string; html: string; text: string } => {
  const subject = `Verify your ${PRODUCT_NAME} email`;
  const text =
    `Hi ${fullName},\n\n` +
    `Welcome to ${PRODUCT_NAME}. Please verify your email address by visiting:\n` +
    `${verifyUrl}\n\n` +
    `This link expires in 24 hours.\n`;
  const html = baseTemplate(`
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#18181b;">Verify your email</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#3f3f46;">
      Hi ${fullName}, welcome to ${PRODUCT_NAME}. Please confirm your email address to activate your account.
    </p>
    <p style="margin:24px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border-radius:8px;">
        Verify email
      </a>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:#52525b;">
      Or paste this link into your browser:
    </p>
    <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#71717a;word-break:break-all;">
      ${verifyUrl}
    </p>
    <p style="margin:20px 0 0 0;font-size:12px;color:#71717a;">This link expires in 24 hours.</p>
  `);
  return { subject, html, text };
};

export const passwordResetEmailTemplate = (
  fullName: string,
  resetUrl: string
): { subject: string; html: string; text: string } => {
  const subject = `Reset your ${PRODUCT_NAME} password`;
  const text =
    `Hi ${fullName},\n\n` +
    `We received a request to reset the password for your ${PRODUCT_NAME} account.\n` +
    `Open this link to choose a new password:\n` +
    `${resetUrl}\n\n` +
    `This link expires in 1 hour. If you did not request a password reset you can ignore this email.\n`;
  const html = baseTemplate(`
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#18181b;">Reset your password</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#3f3f46;">
      Hi ${fullName}, we received a request to reset the password for your ${PRODUCT_NAME} account.
    </p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border-radius:8px;">
        Reset password
      </a>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:#52525b;">
      Or paste this link into your browser:
    </p>
    <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#71717a;word-break:break-all;">
      ${resetUrl}
    </p>
    <p style="margin:20px 0 0 0;font-size:12px;color:#71717a;">This link expires in 1 hour.</p>
  `);
  return { subject, html, text };
};

/**
 * Enqueue a verification email through the existing BullMQ email pipeline.
 *
 * `clientUrl` is the frontend base URL (e.g. http://localhost:5173). The
 * raw token is appended to the URL — only the SHA-256 hash is persisted
 * in the database. Token format: 64 hex chars (256 bits of entropy).
 */
export const enqueueVerificationEmail = async (
  to: string,
  fullName: string,
  rawToken: string
): Promise<void> => {
  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl =
    `${clientUrl.replace(/\/$/, "")}` +
    `/verify-email?token=${encodeURIComponent(rawToken)}`;

  const tpl = verificationEmailTemplate(fullName, verifyUrl);
  await emailQueue.add("send-email", {
    to,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
  });
};

export const enqueuePasswordResetEmail = async (
  to: string,
  fullName: string,
  rawToken: string
): Promise<void> => {
  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:5173";
  const resetUrl =
    `${clientUrl.replace(/\/$/, "")}` +
    `/reset-password?token=${encodeURIComponent(rawToken)}`;

  const tpl = passwordResetEmailTemplate(fullName, resetUrl);
  await emailQueue.add("send-email", {
    to,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
  });
};
