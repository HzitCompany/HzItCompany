import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const guardNavigate = useCallback(
    (to: string) => {
      if (isAuthed) {
        navigate(to);
        return;
      }
      // Redirect to sign-in page with a return URL
      navigate(`/auth?next=${encodeURIComponent(to)}`);
    },
    [isAuthed, navigate]
  );

  return { guardNavigate };
}
