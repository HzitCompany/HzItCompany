import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { isAuthed, openAuthModal } = useAuth();

  const guardNavigate = useCallback(
    (to: string) => {
      if (isAuthed) {
        navigate(to);
        return;
      }

      openAuthModal({ afterAuthNavigateTo: to });
    },
    [isAuthed, navigate, openAuthModal]
  );

  return { guardNavigate };
}
