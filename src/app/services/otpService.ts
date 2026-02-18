import { postJson } from "./apiClient";

// New standardised endpoints (/api/auth/email-otp/*)
export async function requestEmailOtp(input: { email: string }) {
  return postJson<typeof input, { ok: true; message?: string; expiresInSeconds?: number }>(
    "/api/auth/email-otp/request",
    input
  );
}

export async function verifyEmailOtp(input: { email: string; token: string }) {
  return postJson<typeof input, { ok: true; user: { id: string; email: string; full_name: string | null; role: string } }>(
    "/api/auth/email-otp/verify",
    input
  );
}

// Google ID token login
export async function loginWithGoogle(input: { credential: string }) {
  return postJson<typeof input, { ok: true; user: { id: string; email: string; full_name: string | null; role: string } }>(
    "/api/auth/google",
    input
  );
}

// Legacy aliases kept for backwards compatibility
export async function requestOtp(input: { name?: string; email: string }) {
  return requestEmailOtp({ email: input.email });
}

export async function verifyOtp(input: { email: string; token: string }) {
  return verifyEmailOtp(input);
}
