import { postJson } from "./apiClient";

export type CareerUploadKind = "resume" | "cv";

export type CreateCareerUploadUrlInput = {
  kind: CareerUploadKind;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type CreateCareerUploadUrlResponse = {
  ok: true;
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
};

export async function createCareerUploadUrlAuthed(input: CreateCareerUploadUrlInput) {
  return postJson<CreateCareerUploadUrlInput, CreateCareerUploadUrlResponse>("/api/careers/upload-url", input);
}

export async function uploadFileToSignedUrl(signedUrl: string, file: File) {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }
}

export type CareerApplyPayload = {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  linkedinUrl: string;
  whyHireYou: string;
  message?: string;
  experience?: string;
  portfolioUrl?: string;
  resumePath?: string;
  cvPath?: string;
  honeypot?: string;
};

export async function submitCareerApplyAuthed(payload: CareerApplyPayload) {
  return postJson<CareerApplyPayload, { ok: true; id?: number }>("/api/careers/apply", payload);
}
