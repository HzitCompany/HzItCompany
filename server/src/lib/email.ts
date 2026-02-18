import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "./env.js";

export type LeadEmail = {
  subject: string;
  text: string;
};

function getSesClient(): SESClient | null {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return null;
  return new SESClient({
    region: env.AWS_SES_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
  });
}

export function isEmailEnabled() {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.MAIL_FROM && env.MAIL_TO);
}

export async function sendLeadEmail(message: LeadEmail) {
  if (!isEmailEnabled()) return;

  const client = getSesClient()!;
  await client.send(
    new SendEmailCommand({
      Source: env.MAIL_FROM!,
      Destination: { ToAddresses: [env.MAIL_TO!] },
      Message: {
        Subject: { Data: message.subject, Charset: "UTF-8" },
        Body: { Text: { Data: message.text, Charset: "UTF-8" } }
      }
    })
  );
}
