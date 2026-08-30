import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { AuthPageShell } from "@/components/AuthPageShell.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [message, setMessage] = useState(location.state?.message ?? "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      navigate(location.state?.from?.pathname ?? "/aplikacioni", { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Qasje universitare"
      title="Kyçu në hapësirën tuaj"
      description="Përdorni kredencialet e llogarisë aktive të universitetit."
      asideTitle="Operacionet e laboratorëve në një vend."
      asideItems={["Monitorim dhe alarme në kohë reale", "Digital Twin dhe asetet laboratorike", "Raporte të kufizuara sipas rolit"]}
    >
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="login-email">Email-i institucional</label>
        <div className="auth-input-wrap">
          <Mail size={17} aria-hidden="true" />
          <input id="login-email" name="email" type="email" autoComplete="email" placeholder="emri@universiteti.edu" required autoFocus />
        </div>

        <div className="auth-label-row">
          <label htmlFor="login-password">Fjalëkalimi</label>
          <Link to="/harrova-fjalekalimin">Keni harruar fjalëkalimin?</Link>
        </div>
        <div className="auth-input-wrap">
          <LockKeyhole size={17} aria-hidden="true" />
          <input id="login-password" name="password" type={showPassword ? "text" : "password"}
            autoComplete="current-password" required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <label className="auth-checkbox"><input name="rememberMe" type="checkbox" /> Më mbaj të kyçur në këtë pajisje</label>
        {message && <p className="form-message error" role="alert">{message}</p>}
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Duke u kyçur…" : "Kyçu"}<ArrowRight size={18} />
        </Button>
      </form>
      <p className="auth-footnote">Universiteti nuk është regjistruar? <Link to="/regjistrohu">Dërgo kërkesën</Link></p>
      <p className="auth-admin-note">Administrator i platformës? <Link to="/administrimi/kycu">Hap hyrjen administrative</Link></p>
    </AuthPageShell>
  );
}
