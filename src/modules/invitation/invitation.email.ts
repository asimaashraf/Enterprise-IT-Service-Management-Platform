import { emailQueue } from "../../jobs/queues/email.queue";

/**
 * Branded email template for the employee/admin invitation flow.
 *
 * The frontend host is read from `CLIENT_URL` (same convention as the
 * existing verification and password-reset emails). The raw token is
 * appended as a query string; only the SHA-256 hash is persisted.
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
                  If you were not expecting this invitation you can safely ignore it.
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

export const invitationEmailTemplate = (
  inviterName: string,
  organizationName: string,
  role: "admin" | "employee",
  inviteUrl: string
): { subject: string; html: string; text: string } => {
  const subject = `You're invited to join ${organizationName} on ${PRODUCT_NAME}`;
  const roleLabel = role === "admin" ? "administrator" : "team member";
  const text =
    `Hi,\n\n` +
    `${inviterName} has invited you to join ${organizationName} on ${PRODUCT_NAME} as a ${roleLabel}.\n` +
    `Accept the invitation by visiting:\n` +
    `${inviteUrl}\n\n` +
    `This link expires in 48 hours. If you did not expect this invitation you can ignore this email.\n`;
  const html = baseTemplate(`
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#18181b;">You're invited</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#3f3f46;">
      <strong>${inviterName}</strong> has invited you to join
      <strong>${organizationName}</strong> on ${PRODUCT_NAME} as a
      <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:24px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border-radius:8px;">
        Accept invitation
      </a>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:#52525b;">
      Or paste this link into your browser:
    </p>
    <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#71717a;word-break:break-all;">
      ${inviteUrl}
    </p>
    <p style="margin:20px 0 0 0;font-size:12px;color:#71717a;">This link expires in 48 hours.</p>
  `);
  return { subject, html, text };
};

/**
 * Enqueue an invitation email through the existing BullMQ pipeline.
 *
 * `clientUrl` is the frontend base URL. The raw token is appended to the
 * URL — only the SHA-256 hash is persisted in the database.
 */
export const enqueueInvitationEmail = async (
  to: string,
  inviterName: string,
  organizationName: string,
  role: "admin" | "employee",
  rawToken: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const inviteUrl =
    `${clientUrl.replace(/\/$/, "")}` +
    `/accept-invite?token=${encodeURIComponent(rawToken)}`;

  const tpl = invitationEmailTemplate(
    inviterName,
    organizationName,
    role,
    inviteUrl
  );
  await emailQueue.add("send-email", {
    to,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
  });
};
