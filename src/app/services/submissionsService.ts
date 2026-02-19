import { getJson, patchJson } from "./apiClient";

export type SubmissionItem = {
  id: number;
  created_at: string;
  type: "contact" | "hire" | "career";
  data: unknown;
  status?: "new" | "reviewing" | "shortlisted" | "rejected" | "hired" | null;
};

export async function fetchMySubmissions() {
  return getJson<{ ok: true; items: SubmissionItem[] }>("/api/submissions");
}

export async function updateSubmission(id: number, data: Record<string, unknown>) {
  return patchJson<{ data: Record<string, unknown> }, { ok: true }>(
    `/api/submissions/${id}`,
    { data }
  );
}
