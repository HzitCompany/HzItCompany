import nodemailer from "nodemailer";

import { env } from "../env.js";

function getTransport() {
  if (!env.SES_SMTP_USER || !env.SES_SMTP_PASSWORD) return null;
  const host = `email-smtp.${env.AWS_SES_REGION ?? "ap-south-1"}.amazonaws.com`;
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: {
      user: env.SES_SMTP_USER,
      pass: env.SES_SMTP_PASSWORD
    }
  });
}

async function sesSend(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const transport = getTransport();
  if (!transport || !env.MAIL_FROM) return null;

  await transport.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html
  });

  return true;
}

export async function sendOtpEmail(input: { to: string; otp: string; expiresInSeconds: number }) {
  if (!env.SES_SMTP_USER || !env.SES_SMTP_PASSWORD) {
    throw new Error("Email provider is not configured (SES_SMTP_USER / SES_SMTP_PASSWORD missing)");
  }
  if (!env.MAIL_FROM) {
    throw new Error("MAIL_FROM is required for sending email");
  }

  const subject = "Your HZ IT Company verification code";
  const text = `Your verification code is: ${input.otp}\n\nThis code expires in ${Math.round(input.expiresInSeconds / 60)} minutes.`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.4">
      <h2 style="margin:0 0 12px">HZ IT Company</h2>
      <p style="margin:0 0 10px">Your verification code is:</p>
      <div style="font-size:28px; font-weight:700; letter-spacing: 4px; margin: 10px 0 14px">${input.otp}</div>
      <p style="margin:0">This code expires in ${Math.round(input.expiresInSeconds / 60)} minutes.</p>
    </div>
  `;

  const sent = await sesSend({ to: input.to, subject, text, html });
  if (!sent) {
    throw new Error("Email provider is not configured (SMTP credentials missing)");
  }
}

export async function sendAdminSubmissionEmail(input: {
  submissionType: "contact" | "hire" | "career";
  submissionId: number | undefined;
  createdAt: string | undefined;
  userEmail?: string | null;
  userPhone?: string | null;
  data: unknown;
}) {
  if (!env.MAIL_TO) return;

  const subject = `New ${input.submissionType} submission`;
  const text = [
    `Type: ${input.submissionType}`,
    input.submissionId ? `ID: ${input.submissionId}` : null,
    input.createdAt ? `Created: ${input.createdAt}` : null,
    input.userEmail ? `User email: ${input.userEmail}` : null,
    input.userPhone ? `User phone: ${input.userPhone}` : null,
    "",
    "Data:",
    JSON.stringify(input.data ?? {}, null, 2)
  ]
    .filter(Boolean)
    .join("\n");

  await sesSend({ to: env.MAIL_TO, subject, text });
}

export async function sendUserSubmissionEmail(input: {
  to: string;
  submissionType: "contact" | "hire" | "career";
}) {
  const subject = "We received your request \u2014 HZ IT Company";
  const text =
    `Thanks for reaching out to HZ IT Company.\n\n` +
    `We received your ${input.submissionType} request and will respond within 1 business day.\n`;

  await sesSend({ to: input.to, subject, text });
}
