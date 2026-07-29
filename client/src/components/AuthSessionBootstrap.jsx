import { useEffect } from "react";
import { api, TENANT_SESSION_INVALID_EVENT } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";

let activeSessionRequest;

async function requestCurrentSession() {
  return api.post("/api/auth/session");
}

export function AuthSessionBootstrap({ children }) {
  const status = useAuthStore((state) => state.status);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const invalidateSession = () => clearSession();
    window.addEventListener(TENANT_SESSION_INVALID_EVENT, invalidateSession);
    return () =>
      window.removeEventListener(
        TENANT_SESSION_INVALID_EVENT,
        invalidateSession,
      );
  }, [clearSession]);

  useEffect(() => {
    if (status === "authenticated" || status === "unauthenticated") {
      return undefined;
    }

    let active = true;
    if (status === "unknown") setLoading();
    activeSessionRequest ??= requestCurrentSession().finally(() => {
      activeSessionRequest = undefined;
    });

    activeSessionRequest
      .then((response) => {
        if (!active) return;
        if (response.data.user) setSession(response.data.user);
        else clearSession();
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => {
      active = false;
    };
  }, [clearSession, setLoading, setSession, status]);

  return children;
}
