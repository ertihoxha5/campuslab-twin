import { LogOut, ShieldCheck } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { usePlatformAuthStore } from "@/stores/platform-auth-store.js";

export function PlatformLayout() {
  const navigate = useNavigate();
  const administrator = usePlatformAuthStore((state) => state.administrator);
  const clearSession = usePlatformAuthStore((state) => state.clearSession);

  async function logout() {
    try {
      await api.post("/api/platform/auth/logout");
    } finally {
      clearSession();
      navigate("/administrimi/kycu", { replace: true });
    }
  }

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <div className="platform-brand">
          <span>
            <ShieldCheck size={20} />
          </span>
          <div>
            <strong>CampusLab Twin</strong>
            <small>Administrimi i platformës</small>
          </div>
        </div>
        <div className="platform-account">
          <div>
            <strong>{administrator?.fullName}</strong>
            <small>Administrator i platformës</small>
          </div>
          <Button type="button" variant="outline" onClick={logout}>
            <LogOut size={16} /> Dil
          </Button>
        </div>
      </header>
      <main className="platform-content">
        <Outlet />
      </main>
    </div>
  );
}
