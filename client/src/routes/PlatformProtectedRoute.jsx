import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PlatformSessionBootstrap } from "@/components/PlatformSessionBootstrap.jsx";
import { usePlatformAuthStore } from "@/stores/platform-auth-store.js";

function PlatformAccessGate() {
  const location = useLocation();
  const status = usePlatformAuthStore((state) => state.status);

  if (status === "unknown" || status === "loading") {
    return (
      <main className="route-state" aria-live="polite" aria-busy="true">
        <p>Po verifikohet sesioni i administrimit…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate to="/administrimi/kycu" state={{ from: location }} replace />
    );
  }

  return <Outlet />;
}

export function PlatformProtectedRoute() {
  return (
    <PlatformSessionBootstrap>
      <PlatformAccessGate />
    </PlatformSessionBootstrap>
  );
}
