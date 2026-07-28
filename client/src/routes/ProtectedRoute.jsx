import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store.js";

export function ProtectedRoute() {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "unknown" || status === "loading") {
    return (
      <main className="route-state" aria-live="polite" aria-busy="true">
        <p>Po verifikohet sesioni...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/kycu" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
