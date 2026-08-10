import { useEffect, useState } from "react";
import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const emptyAccount = { fullName: "", email: "", phone: "", jobTitle: "" };
const emptyPassword = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [account, setAccount] = useState(emptyAccount);
  const [password, setPassword] = useState(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    api
      .get("/api/account")
      .then((response) =>
        setAccount({ ...emptyAccount, ...response.data.account }),
      )
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put("/api/account", account);
      setAccount({ ...emptyAccount, ...response.data.account });
      setSession({
        ...user,
        fullName: response.data.account.fullName,
        email: response.data.account.email,
      });
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (password.newPassword !== password.confirmPassword) {
      setMessage({ type: "error", text: "Fjalëkalimet e reja nuk përputhen." });
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/api/account/password", password);
      try {
        await api.post("/api/auth/logout");
      } catch {
        // Serveri i ka revokuar sesionet gjatë ndryshimit të fjalëkalimit.
      }
      clearSession();
      navigate("/kycu", {
        replace: true,
        state: {
          message: "Fjalëkalimi u ndryshua. Kyçuni me fjalëkalimin e ri.",
        },
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setSavingPassword(false);
    }
  }

  return (
    <section className="account-settings-page">
      <div className="workspace-page-heading">
        <p className="eyebrow">Llogaria ime</p>
        <h1>Profili dhe siguria</h1>
        <p>Menaxhoni të dhënat personale dhe kredencialet e hyrjes.</p>
      </div>
      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}
      {loading ? (
        <div className="maintenance-loading">Po ngarkohet llogaria…</div>
      ) : (
        <div className="account-settings-grid">
          <form className="account-settings-card" onSubmit={saveProfile}>
            <header>
              <span>
                <UserRound size={18} />
              </span>
              <div>
                <h2>Profili personal</h2>
                <p>Këto të dhëna shfaqen brenda workspace-it.</p>
              </div>
            </header>
            <div className="account-form-fields">
              <label>
                <span>Emri i plotë</span>
                <input
                  required
                  minLength="3"
                  maxLength="160"
                  autoComplete="name"
                  value={account.fullName}
                  onChange={(event) =>
                    setAccount({ ...account, fullName: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Email-i</span>
                <input
                  type="email"
                  required
                  maxLength="190"
                  autoComplete="email"
                  value={account.email}
                  onChange={(event) =>
                    setAccount({ ...account, email: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Telefoni</span>
                <input
                  maxLength="40"
                  autoComplete="tel"
                  value={account.phone}
                  onChange={(event) =>
                    setAccount({ ...account, phone: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Pozita</span>
                <input
                  maxLength="120"
                  autoComplete="organization-title"
                  value={account.jobTitle}
                  onChange={(event) =>
                    setAccount({ ...account, jobTitle: event.target.value })
                  }
                />
              </label>
            </div>
            <footer>
              <Button disabled={savingProfile}>
                <Save size={16} />{" "}
                {savingProfile ? "Po ruhet…" : "Ruaj profilin"}
              </Button>
            </footer>
          </form>
          <form
            className="account-settings-card account-security-card"
            onSubmit={changePassword}
          >
            <header>
              <span>
                <ShieldCheck size={18} />
              </span>
              <div>
                <h2>Siguria</h2>
                <p>Ndryshimi i fjalëkalimit mbyll të gjitha sesionet aktive.</p>
              </div>
            </header>
            <div className="account-form-fields">
              <label>
                <span>Fjalëkalimi aktual</span>
                <input
                  type="password"
                  required
                  maxLength="128"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={(event) =>
                    setPassword({
                      ...password,
                      currentPassword: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Fjalëkalimi i ri</span>
                <input
                  type="password"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                  aria-describedby="account-password-help"
                  value={password.newPassword}
                  onChange={(event) =>
                    setPassword({
                      ...password,
                      newPassword: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Konfirmo fjalëkalimin e ri</span>
                <input
                  type="password"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                  value={password.confirmPassword}
                  onChange={(event) =>
                    setPassword({
                      ...password,
                      confirmPassword: event.target.value,
                    })
                  }
                />
              </label>
              <p id="account-password-help" className="account-password-help">
                Minimumi 12 karaktere, me shkronjë të madhe, të vogël, numër dhe
                simbol.
              </p>
            </div>
            <footer>
              <Button disabled={savingPassword}>
                <KeyRound size={16} />{" "}
                {savingPassword ? "Po ndryshohet…" : "Ndrysho fjalëkalimin"}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
