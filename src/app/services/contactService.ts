import { postJson } from "./apiClient";

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  honeypot?: string;
};

export type HireUsPayload = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  services: string[];
  projectName: string;
  projectDescription: string;
  serviceDetails?: Record<string, string>;
  deliveryDays: number;
  clarification?: string;
  personalMessage?: string;
  referenceUrl?: string;
  additionalNotes?: string;
  honeypot?: string;
};

export type CareerPayload = {
  name: string;
  email: string;
  phone: string;
  role: string;
  experience?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  message?: string;
  honeypot?: string;
};

export async function submitContactAuthed(payload: ContactPayload) {
  const normalizedMessage = [payload.subject ? `Subject: ${payload.subject}` : "", payload.message]
    .filter(Boolean)
    .join("\n\n");

  // Contact is a public endpoint — pass token "" to skip auto-token acquisition
  // which otherwise blocks for ~10s on LockManager timeout.
  return postJson<{ name: string; email: string; phone?: string; message: string }, { success: true }>(
    "/api/contact",
    {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: normalizedMessage,
    },
    { token: "" }
  );
}

export async function submitHireUsAuthed(payload: HireUsPayload) {
  // Use the public /api/hire-us endpoint so no auth token is required.
  const serviceSummary = payload.services?.join(", ") ?? "";
  const details = JSON.stringify({
    phone: payload.phone,
    company: payload.company,
    services: payload.services,
    projectName: payload.projectName,
    projectDescription: payload.projectDescription,
    serviceDetails: payload.serviceDetails,
    deliveryDays: payload.deliveryDays,
    clarification: payload.clarification,
    personalMessage: payload.personalMessage,
    referenceUrl: payload.referenceUrl,
    additionalNotes: payload.additionalNotes,
  });

  return postJson<{ name: string; email: string; phone?: string; service: string; details?: string }, { success: true }>(
    "/api/hire-us",
    {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      service: serviceSummary,
      details,
    },
    { token: "" }
  );
}

export async function submitCareerAuthed(payload: CareerPayload) {
  return postJson<{ type: "career"; data: CareerPayload; honeypot?: string }, { ok: true; id?: number }>(
    "/api/submissions",
    {
      type: "career",
      data: payload,
      honeypot: payload.honeypot,
    }
  );
}
