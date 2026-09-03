import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Terminal, UserRoundCheck } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [terminalState, setTerminalState] = useState("awaiting_identity");

  if (status === "authenticated") return <Navigate to="/administrimi" replace />;

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setTerminalState("verifying_clearance");
    const values = new FormData(event.currentTarget);

    try {
      const response = await api.post("/api/platform/auth/login", {
        email: values.get("email"),
        password: values.get("password"),
      });
      setSession(response.data.administrator);
      setTerminalState("access_granted");
      navigate(location.state?.from?.pathname ?? "/administrimi", { replace: true });
    } catch (error) {
      setMessage(error.message);
      setTerminalState("nice_try_human");
    } finally {
      setLoading(false);
    }
  }

  return <main className="platform-login-page">
    <div className="secret-noise" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    <section className="secret-login-shell">
      <aside className="secret-terminal" aria-label="Statusi i portalit administrativ">
        <header><span><Terminal size={15} /> CLT_SECURE_SHELL</span><i /><i /><i /></header>
        <div className="terminal-output" aria-live="polite">
          <p><span>01</span> boot secure_admin_portal...</p>
          <p><span>02</span> tenant firewall <b>ONLINE</b></p>
          <p><span>03</span> coffee dependency <b>RESOLVED</b></p>
          <p><span>04</span> public users <em>NOT INVITED</em></p>
          <p className="terminal-active"><span>05</span> status: <strong>{terminalState}</strong><i /></p>
        </div>
        <div className="secret-vault" aria-hidden="true"><div><LockKeyhole /><span /><span /><span /></div><p>VAULT / PLATFORM</p><small>Zero passwords displayed here. Nice try.</small></div>
        <footer><span><i /> ENCRYPTED</span><small>CampusLab Twin · restricted zone</small></footer>
      </aside>

      <section className="platform-login-panel">
        <div className="secret-badge"><ShieldCheck size={15} /> NIVELI 04 · QASJE E KUFIZUAR</div>
        <p className="eyebrow">Portali sekret-ish</p>
        <h1>Administrimi i platformës</h1>
        <p>Nëse nuk e dije që ekziston kjo faqe, ndoshta nuk duhej ta dije. Nëse je administrator—mirë se u ktheve.</p>
        <div className="secret-warning"><KeyRound /><span><strong>Kontroll identiteti</strong><small>Vetëm administratorët e autorizuar të CampusLab Twin.</small></span></div>
        <form onSubmit={submit}>
          <label htmlFor="platform-email">Email-i i administratorit</label>
          <div className="secret-input"><UserRoundCheck /><input id="platform-email" name="email" type="email" autoComplete="email" required placeholder="admin@campuslab..." onFocus={() => setTerminalState("identity_detected")} /></div>
          <label htmlFor="platform-password">Fjalëkalimi super-sekret</label>
          <div className="secret-input"><LockKeyhole /><input id="platform-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required onFocus={() => setTerminalState("awaiting_secret")} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          {message && <p className="form-message error" role="alert">{message}</p>}
          <Button type="submit" size="lg" disabled={loading}>{loading ? "Po verifikohet niveli i qasjes…" : "Hap vault-in"}<KeyRound size={17} /></Button>
        </form>
        <p className="secret-footnote">Nuk jeni admin i platformës? Kjo është pjesa ku ecni ngadalë mbrapsht. 👀</p>
        <Link className="form-back-link" to="/"><ArrowLeft size={16} /> Dil sikur nuk pe asgjë</Link>
      </section>
    </section>
  </main>;
}
