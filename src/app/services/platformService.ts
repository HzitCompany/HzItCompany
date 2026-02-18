import { deleteJson, getJson, patchJson, postJson, putJson } from "./apiClient";

export type PricingItem = {
  id: number;
  service_key: string;
  service_name: string;
  plan_key: string;
  plan_name: string;
  price_inr: number;
};

export async function fetchPricing() {
  return getJson<{ ok: true; items: PricingItem[] }>("/api/pricing");
}

export async function createOrder(input: { pricingId: number; name: string; email: string }) {
  return postJson<typeof input, {
    ok: true;
    orderId: number;
    razorpay: { keyId: string; orderId: string; amount: number; currency: "INR" };
  }>("/api/orders", input);
}

export async function verifyPayment(input: {
  orderId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return postJson<typeof input, { ok: true; invoiceNumber?: string; alreadyPaid?: boolean }>("/api/payments/verify", input);
}

export async function registerClient(input: { name: string; email: string; password: string }) {
  return postJson<typeof input, { ok: true; token: string; role: "client" }>("/api/auth/register", input);
}

export async function login(input: { email: string; password: string }) {
  return postJson<typeof input, { ok: true; token: string; role: "client" | "admin" }>("/api/auth/login", input);
}

export async function loginWithSupabase(accessToken: string) {
  return postJson<{ accessToken: string }, { ok: true; token: string; role: "client" | "admin" }>(
    "/api/auth/supabase",
    { accessToken }
  );
}

export async function fetchPortalOrders() {
  return getJson<{ ok: true; items: any[] }>("/api/portal/orders");
}

export async function fetchAdminSummary() {
  return getJson<{ ok: true; totals: { orders: number; paidOrders: number; revenueInr: number } }>("/api/admin/summary");
}

export async function fetchAdminOrders(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return getJson<{ ok: true; items: any[] }>(`/api/admin/orders${q}`);
}

export async function fetchAdminPricing() {
  return getJson<{ ok: true; items: any[] }>("/api/admin/pricing");
}

export async function upsertAdminPricing(
  input: {
    serviceKey: string;
    serviceName: string;
    planKey: string;
    planName: string;
    priceInr: number;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  return postJson<typeof input, { ok: true; id?: number }>("/api/admin/pricing", input);
}

export async function fetchAdminContactLeads() {
  return getJson<{ ok: true; items: any[] }>("/api/admin/leads/contact");
}

export async function fetchAdminHireLeads() {
  return getJson<{ ok: true; items: any[] }>("/api/admin/leads/hire");
}

export async function fetchAdminSubmissions(
  opts?: { type?: "contact" | "hire" | "career"; q?: string; limit?: number }
) {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.q) params.set("q", opts.q);
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  const q = params.toString();
  return getJson<{ ok: true; items: any[] }>(`/api/admin/submissions${q ? `?${q}` : ""}`);
}

export async function deleteAdminSubmission(id: number) {
  return deleteJson<{ ok: true }>(`/api/admin/submissions/${id}`);
}

export type CareerApplicationStatus = "new" | "reviewing" | "shortlisted" | "rejected" | "hired";

export async function fetchAdminCareers(
  opts?: { q?: string; status?: CareerApplicationStatus; limit?: number }
) {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.status) params.set("status", opts.status);
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  const q = params.toString();
  return getJson<{ ok: true; items: any[] }>(`/api/admin/careers${q ? `?${q}` : ""}`);
}

export async function updateAdminCareerStatus(id: number, status: CareerApplicationStatus) {
  return patchJson<{ status: CareerApplicationStatus }, { ok: true }>(`/api/admin/careers/${id}`, { status });
}

export async function createAdminCareerDownloadUrl(
  id: number,
  kind: "resume" | "cv",
  expiresInSeconds?: number
) {
  const params = new URLSearchParams();
  params.set("kind", kind);
  if (typeof expiresInSeconds === "number") params.set("expiresInSeconds", String(expiresInSeconds));
  const q = params.toString();
  return getJson<{ ok: true; url: string; expiresInSeconds: number }>(`/api/admin/careers/${id}/download-url?${q}`);
}

export async function fetchAdminContent() {
  return getJson<{ ok: true; items: Array<{ key: string; value: unknown; updated_at: string }> }>("/api/admin/content");
}

export async function fetchAdminOtpLogs(opts?: { limit?: number }) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set("limit", String(opts.limit));
  return getJson<{ ok: true; items: any[] }>(`/api/admin/otp${q.toString() ? `?${q}` : ""}`);
}

export async function upsertAdminContent(input: { key: string; value: unknown }) {
  return putJson<typeof input, { ok: true }>("/api/admin/content", input);
}
