import nodemailer from "nodemailer";
import { env } from "./env.js";

export type LeadEmail = {
  subject: string;
  text: string;
};

function getTransport() {
  if (!env.SES_SMTP_USER || !env.SES_SMTP_PASSWORD) return null;
  const host = `email-smtp.${env.AWS_SES_REGION ?? "ap-south-1"}.amazonaws.com`;
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user: env.SES_SMTP_USER, pass: env.SES_SMTP_PASSWORD }
  });
}

export function isEmailEnabled() {
  return Boolean(env.SES_SMTP_USER && env.SES_SMTP_PASSWORD && env.MAIL_FROM && env.MAIL_TO);
}

export async function sendLeadEmail(message: LeadEmail) {
  if (!isEmailEnabled()) return;
  const transport = getTransport()!;
  await transport.sendMail({
    from: env.MAIL_FROM!,
    to: env.MAIL_TO!,
    subject: message.subject,
    text: message.text
  });
}
