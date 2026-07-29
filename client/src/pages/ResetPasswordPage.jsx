import { useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = values.get("password");
    const confirmPassword = values.get("confirmPassword");

    if (password !== confirmPassword) {
      setStatus({
        type: "error",
        message: "Fjalëkalimet nuk përputhen.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      setCompleted(true);
      setStatus({ type: "success", message: response.data.message });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  const missingToken = token.length < 32;

  return (
    <section className="form-page">
      <div className="form-shell compact-form">
        <span className="form-icon" aria-hidden="true">
          <LockKeyhole size={22} />
        </span>
        <p className="eyebrow">Siguria e llogarisë</p>
        <h1>Vendosni fjalëkalimin e ri</h1>
        <p>
          Përdorni të paktën 12 karaktere, me shkronjë të madhe, shkronjë të
          vogël, numër dhe simbol.
        </p>

        {missingToken ? (
          <p className="form-message error" role="alert">
            Lidhja e rikuperimit mungon ose nuk është e vlefshme. Kërkoni një
            lidhje të re.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Fjalëkalimi i ri
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength="12"
                disabled={completed}
                required
              />
            </label>
            <label>
              Konfirmoni fjalëkalimin
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength="12"
                disabled={completed}
                required
              />
            </label>
            {status.message && (
              <p className={`form-message ${status.type}`} role="status">
                {status.message}
              </p>
            )}
            {completed ? (
              <Button asChild size="lg">
                <Link to="/kycu">Vazhdo te kyçja</Link>
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Po ruhet…" : "Ruaj fjalëkalimin"}
              </Button>
            )}
          </form>
        )}

        <Link className="form-back-link" to="/kycu">
          <ArrowLeft size={16} /> Kthehu te kyçja
        </Link>
      </div>
    </section>
  );
}
