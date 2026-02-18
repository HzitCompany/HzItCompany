// Session helpers are kept for backward compatibility only.
// Active session state is now managed via HTTP-only cookie on the backend,
// read by AuthProvider on load via /api/auth/me.

export type SessionRole = "user" | "admin" | "client";

/** @deprecated sessions are cookie-based; use AuthProvider instead */
export function getSessionToken() {
  return localStorage.getItem("hz_session_token");
}

/** @deprecated sessions are cookie-based; use AuthProvider instead */
export function getSessionRole(): SessionRole | null {
  const v = localStorage.getItem("hz_session_role");
  return v === "user" || v === "admin" || v === "client" ? v : null;
}

/** @deprecated sessions are cookie-based; retained only for legacy callers */
export function setSession(_token: string, _role: SessionRole) {
  // no-op; cookie is set by backend
}

/** @deprecated sessions are cookie-based; retained only for legacy callers */
export function clearSession() {
  localStorage.removeItem("hz_session_token");
  localStorage.removeItem("hz_session_role");
}
