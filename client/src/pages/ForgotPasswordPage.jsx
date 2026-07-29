import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

export function ForgotPasswordPage() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await api.post("/api/auth/forgot-password", {
        email: new FormData(event.currentTarget).get("email"),
      });
      setStatus({ type: "success", message: response.data.message });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <div className="form-shell compact-form">
        <span className="form-icon" aria-hidden="true">
          <Mail size={22} />
        </span>
        <p className="eyebrow">Rikuperimi i llogarisë</p>
        <h1>Harruat fjalëkalimin?</h1>
        <p>
          Shkruani email-in institucional. Nëse llogaria është aktive, do të
          merrni udhëzimet për vendosjen e një fjalëkalimi të ri.
        </p>
        <form onSubmit={submit}>
          <label>
            Email-i institucional
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="emri@universiteti.edu"
              required
            />
          </label>
          {status.message && (
            <p className={`form-message ${status.type}`} role="status">
              {status.message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Po dërgohet…" : "Dërgo udhëzimet"}
          </Button>
        </form>
        <Link className="form-back-link" to="/kycu">
          <ArrowLeft size={16} /> Kthehu te kyçja
        </Link>
      </div>
    </section>
  );
}
