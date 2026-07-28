import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

export function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const values = new FormData(event.currentTarget);

    try {
      await api.post("/api/auth/login", {
        email: values.get("email"),
        password: values.get("password"),
        rememberMe: values.get("rememberMe") === "on",
      });
      navigate("/");
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
