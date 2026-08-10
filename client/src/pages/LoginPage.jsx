import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [message, setMessage] = useState(location.state?.message ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const values = new FormData(event.currentTarget);

    try {
      const response = await api.post("/api/auth/login", {
        email: values.get("email"),
        password: values.get("password"),
        rememberMe: values.get("rememberMe") === "on",
      });
      setSession(response.data.user);
      const destination = location.state?.from?.pathname ?? "/aplikacioni";
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <div className="form-shell compact-form">
        <p className="eyebrow">Mirë se vini</p>
        <h1>Kyçu në CampusLab Twin</h1>
        <p>Përdorni llogarinë aktive të universitetit tuaj.</p>
        <form onSubmit={submit}>
          <label>
            Email-i institucional
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
          <label className="check-field">
            <input name="rememberMe" type="checkbox" /> Më mbaj të kyçur
          </label>
          <Link className="form-support-link" to="/harrova-fjalekalimin">
            Keni harruar fjalëkalimin?
          </Link>
          {message && (
            <p className="form-message error" role="alert">
              {message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Po kyçemi…" : "Kyçu"} <ArrowRight size={18} />
          </Button>
        </form>
        <p className="form-footnote">
          Nuk keni llogari?{" "}
          <Link to="/regjistrohu">Regjistro universitetin</Link>
        </p>
      </div>
    </section>
  );
}
