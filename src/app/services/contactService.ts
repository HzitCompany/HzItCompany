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

  return postJson<{ name: string; email: string; phone?: string; message: string }, { success: true }>(
    "/api/contact",
    {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: normalizedMessage,
    }
  );
}

export async function submitHireUsAuthed(payload: HireUsPayload) {
  return postJson<{ type: "hire"; data: HireUsPayload; honeypot?: string }, { ok: true; id?: number }>(
    "/api/submissions",
    {
      type: "hire",
      data: payload,
      honeypot: payload.honeypot,
    }
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
