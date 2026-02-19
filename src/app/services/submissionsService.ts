import { getJson } from "./apiClient";

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
