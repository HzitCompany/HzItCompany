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
  budget: string;
  timeline: string;
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
  return postJson<{ type: "contact"; data: ContactPayload; honeypot?: string }, { ok: true; id?: number }>(
    "/api/submissions",
    {
      type: "contact",
      data: payload,
      honeypot: payload.honeypot,
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
