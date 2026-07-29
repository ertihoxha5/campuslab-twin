import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { usePlatformAuthStore } from "@/stores/platform-auth-store.js";

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = usePlatformAuthStore((state) => state.status);
  const setSession = usePlatformAuthStore((state) => state.setSession);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (status === "authenticated") {
    return <Navigate to="/administrimi" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const values = new FormData(event.currentTarget);

    try {
      const response = await api.post("/api/platform/auth/login", {
        email: values.get("email"),
        password: values.get("password"),
      });
      setSession(response.data.administrator);
      navigate(location.state?.from?.pathname ?? "/administrimi", {
        replace: true,
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="platform-login-page">
      <section className="platform-login-panel">
        <span className="form-icon">
          <ShieldCheck size={22} />
        </span>
        <p className="eyebrow">Qasje e kufizuar</p>
        <h1>Administrimi i platformës</h1>
        <p>
          Ky seksion është vetëm për administratorët e autorizuar të CampusLab
          Twin.
        </p>
        <form onSubmit={submit}>
          <label>
            Email-i
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Fjalëkalimi
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {message && (
            <p className="form-message error" role="alert">
              {message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Po kyçemi…" : "Kyçu në administrim"}
          </Button>
        </form>
        <Link className="form-back-link" to="/">
          <ArrowLeft size={16} /> Kthehu në kryefaqe
        </Link>
      </section>
    </main>
  );
}
