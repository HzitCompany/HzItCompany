import { supabase } from "../lib/supabase";

export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

function getBaseUrl() {
  const envAny = (import.meta as any).env ?? {};
  const base = (envAny.VITE_API_BASE_URL as string | undefined) ?? (envAny.VITE_API_URL as string | undefined);
  const normalized = base?.replace(/\/$/, "") ?? "";
  return normalized;
}

function joinBaseAndPath(base: string, path: string) {
  const baseNormalized = base.replace(/\/$/, "");
  const pathNormalized = path.startsWith("/") ? path : `/${path}`;

  // If the base URL already contains a pathname (e.g. https://api.com/api or /api/content)
  // and the caller passes an absolute path that repeats it, dedupe.
  try {
    const url = new URL(baseNormalized);
    const basePath = url.pathname.replace(/\/$/, "");
    if (basePath && basePath !== "/") {
      if (
        pathNormalized === basePath ||
        pathNormalized.startsWith(`${basePath}/`) ||
        pathNormalized.startsWith(`${basePath}?`)
      ) {
        return `${baseNormalized}${pathNormalized.slice(basePath.length)}`;
      }
    }
  } catch {
    // ignore (base might be empty or relative)
  }

  // Tolerate env misconfiguration where base already includes '/api'
  // but callers also pass '/api/...' paths.
  if (baseNormalized.endsWith("/api") && pathNormalized.startsWith("/api/")) {
    return `${baseNormalized}${pathNormalized.slice(4)}`;
  }

  return `${baseNormalized}${pathNormalized}`;
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let cachedAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  cachedAuthToken = token;
}

function readStoredAccessToken(): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;

    // Prefer the token for the currently configured Supabase project.
    // Otherwise, scanning localStorage may pick up a token from a different project
    // (common during development / multiple deployments), causing persistent 401s.
    const supabaseUrl = (supabase as any)?.supabaseUrl as string | undefined;
    if (supabaseUrl) {
      try {
        const host = new URL(supabaseUrl).host;
        const ref = host.split(".")[0];
        if (ref) {
          const preferredKey = `sb-${ref}-auth-token`;
          const raw = window.localStorage.getItem(preferredKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const token =
              (parsed?.currentSession?.access_token as string | undefined) ??
              (parsed?.access_token as string | undefined) ??
              null;
            if (token && typeof token === "string") return token;
          }
        }
      } catch {
        // ignore
      }
    }

    // Supabase stores sessions under keys like: sb-<project-ref>-auth-token
    // We scan for any such key to avoid hardcoding the ref.
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!/^sb-[a-z0-9]+-auth-token$/i.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);

      // Depending on supabase-js version, token may be nested.
      const token =
        (parsed?.currentSession?.access_token as string | undefined) ??
        (parsed?.access_token as string | undefined) ??
        null;
      if (token && typeof token === "string") return token;
    }
  } catch {
    // Ignore storage parsing issues.
  }
  return null;
}

async function getAuthToken(): Promise<string | null> {
  if (cachedAuthToken) return cachedAuthToken;
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    if (token) cachedAuthToken = token;
    return token;
  } catch {
    // In some browsers / multi-tab scenarios, Supabase may fail acquiring a lock
    // (Navigator LockManager) and throw. Public pages must keep working.
    const token = readStoredAccessToken();
    if (token) cachedAuthToken = token;
    return token;
  }
}

async function requestJson<TResponse>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options?: {
    body?: unknown;
    signal?: AbortSignal;
    token?: string; // Optional manual override
  }
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  // Get Supabase token if not provided explicitly
  const token = options?.token ?? await getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(joinBaseAndPath(getBaseUrl(), path), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    const details = await parseJsonSafe(response);
    const error: ApiError = {
      message:
        typeof details === "object" && details
          ? ("message" in (details as any)
              ? String((details as any).message)
              : "error" in (details as any)
                ? String((details as any).error)
                : `Request failed (${response.status})`)
          : `Request failed (${response.status})`,
      status: response.status,
      details,
    };
    throw error;
  }

  const json = (await parseJsonSafe(response)) as TResponse;
  return json;
}

export function getJson<TResponse>(path: string, options?: { signal?: AbortSignal; token?: string }) {
  return requestJson<TResponse>("GET", path, { signal: options?.signal, token: options?.token });
}

export async function postJson<TRequest extends Record<string, unknown>, TResponse>(
  path: string,
  body: TRequest,
  options?: { signal?: AbortSignal; token?: string }
): Promise<TResponse> {
  return requestJson<TResponse>("POST", path, {
    body,
    signal: options?.signal,
    token: options?.token,
  });
}

export async function putJson<TRequest extends Record<string, unknown>, TResponse>(
  path: string,
  body: TRequest,
  options?: { signal?: AbortSignal; token?: string }
): Promise<TResponse> {
  return requestJson<TResponse>("PUT", path, {
    body,
    signal: options?.signal,
    token: options?.token,
  });
}

export async function patchJson<TRequest extends Record<string, unknown>, TResponse>(
  path: string,
  body: TRequest,
  options?: { signal?: AbortSignal; token?: string }
): Promise<TResponse> {
  return requestJson<TResponse>("PATCH", path, {
    body,
    signal: options?.signal,
    token: options?.token,
  });
}

export function deleteJson<TResponse>(path: string, options?: { signal?: AbortSignal; token?: string }) {
  return requestJson<TResponse>("DELETE", path, { signal: options?.signal, token: options?.token });
}
