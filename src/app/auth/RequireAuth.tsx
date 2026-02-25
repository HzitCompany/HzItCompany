import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthed, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthed) return;
    // Redirect to the auth/sign-in page with a return URL
    navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
  }, [isLoading, isAuthed, location.pathname, location.search, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Checking access…
      </div>
    );
  }

  if (isAuthed) return <>{children}</>;

  return null;
}
