import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store.js";

export function PermissionRoute({ anyOf }) {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  if (!anyOf.some((permission) => permissions.includes(permission))) {
    return <Navigate to="/aplikacioni/e-ndaluar" replace />;
  }
  return <Outlet />;
}
