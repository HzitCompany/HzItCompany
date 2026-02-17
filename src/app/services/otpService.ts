import { postJson } from "./apiClient";

export async function requestOtp(input: { name?: string; email: string; phone: string }) {
  return postJson<typeof input, { ok: true; debugOtp?: string; expiresInSeconds?: number }>(
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

export async function requestOtpBoth(input: { name?: string; email: string; phone: string }) {
  return postJson<typeof input, { ok: true; debug?: { smsOtp: string; emailOtp: string }; expiresInSeconds?: number }>(
    "/api/auth/otp/request-both",
    input
  );
}

export async function verifyOtpBoth(input: { phone: string; email: string; smsOtp: string; emailOtp: string }) {
  return postJson<typeof input, { ok: true; token: string; isVerified: boolean }>(
    "/api/auth/otp/verify-both",
    input
  );
}
