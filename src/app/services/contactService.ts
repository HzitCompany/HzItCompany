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
  return postJson<{ type: string; data: Record<string, unknown>; honeypot?: string }, { ok: true }>(
    "/api/submissions",
    {
      type: "contact",
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        subject: payload.subject,
        message: payload.message,
      },
      honeypot: payload.honeypot,
    }
  );
}

export async function submitHireUsAuthed(payload: HireUsPayload) {
  return postJson<{ type: string; data: Record<string, unknown>; honeypot?: string }, { ok: true }>(
    "/api/submissions",
    {
      type: "hire",
      data: {
        name: payload.name,
        email: payload.email,
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
      },
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
