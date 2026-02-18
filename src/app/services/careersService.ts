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
  return uploadFileToSignedUrlWithProgress(signedUrl, file);
}

export function uploadFileToSignedUrlWithProgress(
  signedUrl: string,
  file: File,
  opts?: {
    onProgress?: (pct: number) => void;
    timeoutMs?: number;
  }
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 120_000;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      opts?.onProgress?.(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const msg = (xhr.responseText || "").trim();
      reject(new Error(msg || `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));

    xhr.send(file);
  });
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
