import { useEffect } from "react";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";

let activeSessionRequest;

async function requestCurrentSession() {
  try {
    return await api.get("/api/auth/me");
  } catch (error) {
    if (error.status !== 401) throw error;
    return api.post("/api/auth/refresh");
  }
}

export function AuthSessionBootstrap({ children }) {
  const status = useAuthStore((state) => state.status);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

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
        if (active) setSession(response.data.user);
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
