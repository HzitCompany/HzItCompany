import { Resend } from "resend";

import { env } from "../env.js";

function getResendClient() {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
}

export async function sendOtpEmail(input: { to: string; otp: string; expiresInSeconds: number }) {
  const client = getResendClient();
  if (!client) {
    throw new Error("Email provider is not configured (RESEND_API_KEY missing)");
  }
  if (!env.MAIL_FROM) {
    throw new Error("MAIL_FROM is required when RESEND_API_KEY is set");
  }

  const subject = "Your HZ IT Company verification code";
  const text = `Your verification code is: ${input.otp}\n\nThis code expires in ${Math.round(input.expiresInSeconds / 60)} minutes.`;

  await client.emails.send({
    from: env.MAIL_FROM,
    to: input.to,
    subject,
    text,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.4">
        <h2 style="margin:0 0 12px">HZ IT Company</h2>
        <p style="margin:0 0 10px">Your verification code is:</p>
        <div style="font-size:28px; font-weight:700; letter-spacing: 4px; margin: 10px 0 14px">${input.otp}</div>
        <p style="margin:0">This code expires in ${Math.round(input.expiresInSeconds / 60)} minutes.</p>
      </div>
    `
  });
}

export async function sendAdminSubmissionEmail(input: {
  submissionType: "contact" | "hire" | "career";
  submissionId: number | undefined;
  createdAt: string | undefined;
  userEmail?: string | null;
  userPhone?: string | null;
  data: unknown;
}) {
  const client = getResendClient();
  if (!client) return;
  if (!env.MAIL_FROM || !env.MAIL_TO) return;

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

  await client.emails.send({
    from: env.MAIL_FROM,
    to: env.MAIL_TO,
    subject,
    text
  });
}

export async function sendUserSubmissionEmail(input: {
  to: string;
  submissionType: "contact" | "hire" | "career";
}) {
  const client = getResendClient();
  if (!client) return;
  if (!env.MAIL_FROM) return;

  const subject = "We received your request — HZ IT Company";
  const text =
    `Thanks for reaching out to HZ IT Company.\n\n` +
    `We received your ${input.submissionType} request and will respond within 1 business day.\n`;

  await client.emails.send({
    from: env.MAIL_FROM,
    to: input.to,
    subject,
    text
  });
}
