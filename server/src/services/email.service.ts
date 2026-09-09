import nodemailer from "nodemailer";

// ==========================================
// EMAIL TRANSPORTER
// ==========================================

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(
    process.env.SMTP_PORT || 587
  );
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (
    !host ||
    !user ||
    !pass
  ) {
    throw new Error(
      "SMTP configuration is incomplete"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure:
      process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });
};

// ==========================================
// SEND EMAIL
// ==========================================

export interface SendEmailData {
  to: string;

  subject: string;

  text?: string;

  html?: string;
}

export const sendEmail = async (
  data: SendEmailData
) => {
  const transporter =
    createTransporter();

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER;

  if (!from) {
    throw new Error(
      "SMTP_FROM or SMTP_USER must be configured"
    );
  }

  const info =
    await transporter.sendMail({
      from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    });

  console.log(
    "Email sent successfully"
  );

  console.log(
    "Message ID:",
    info.messageId
  );

  console.log(
    "Recipient:",
    data.to
  );

  return info;
};