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

export async function createCareerUploadUrlAuthed(token: string, input: CreateCareerUploadUrlInput) {
  return postJson<CreateCareerUploadUrlInput, CreateCareerUploadUrlResponse>("/api/careers/upload-url", input, { token });
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
  message?: string;
  experience?: string;
  portfolioUrl?: string;
  resumePath?: string;
  cvPath?: string;
  honeypot?: string;
};

export async function submitCareerApplyAuthed(token: string, payload: CareerApplyPayload) {
  return postJson<CareerApplyPayload, { ok: true; id?: number }>("/api/careers/apply", payload, { token });
}
