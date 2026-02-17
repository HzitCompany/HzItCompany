import { postJson } from "./apiClient";

export async function requestOtp(input: { name?: string; email: string; phone: string }) {
  return postJson<typeof input, { ok: true; expiresInSeconds?: number }>(
    "/api/auth/otp/request",
    input
  );
}

export async function verifyOtp(input: { phone: string; otp: string }) {
  return postJson<typeof input, { ok: true; token: string; isVerified: boolean }>(
    "/api/auth/otp/verify",
    input
  );
}
