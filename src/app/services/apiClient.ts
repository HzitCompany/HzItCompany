export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

function getBaseUrl() {
  const envAny = (import.meta as any).env ?? {};
  const base = (envAny.VITE_API_BASE_URL as string | undefined) ?? (envAny.VITE_API_URL as string | undefined);
  return base?.replace(/\/$/, "") ?? "";
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

async function requestJson<TResponse>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options?: {
    body?: unknown;
    signal?: AbortSignal;
    token?: string;
  }
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`,
    {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    }
  );

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
