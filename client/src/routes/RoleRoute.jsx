import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store.js";

export function RoleRoute({ allowedRoles }) {
  const user = useAuthStore((state) => state.user);
  const userRoles = user?.roles ?? [];
  const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to="/e-ndaluar" replace />;
  }

  return <Outlet />;
}
