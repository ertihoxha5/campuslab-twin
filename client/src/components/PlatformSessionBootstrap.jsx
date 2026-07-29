import { useEffect } from "react";
import { api } from "@/api/client.js";
import { usePlatformAuthStore } from "@/stores/platform-auth-store.js";

let activePlatformSessionRequest;

export function PlatformSessionBootstrap({ children }) {
  const status = usePlatformAuthStore((state) => state.status);
  const setLoading = usePlatformAuthStore((state) => state.setLoading);
  const setSession = usePlatformAuthStore((state) => state.setSession);
  const clearSession = usePlatformAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (status === "authenticated" || status === "unauthenticated") {
      return undefined;
    }

    let active = true;
    if (status === "unknown") setLoading();
    activePlatformSessionRequest ??= api
      .post("/api/platform/auth/session")
      .finally(() => {
        activePlatformSessionRequest = undefined;
      });

    activePlatformSessionRequest
      .then((response) => {
        if (!active) return;
        const administrator = response.data.administrator;
        if (administrator) setSession(administrator);
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
