import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const initialSettings = {
  registrationsOpen: true,
  requireWebsiteDomainMatch: true,
  allowPublicEmailProviders: false,
};

export function PlatformSettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [exceptions, setExceptions] = useState([]);
  const [form, setForm] = useState({
    emailDomain: "",
    websiteDomain: "",
    reason: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.get("/api/platform/settings");
      setSettings(response.data.settings);
      setExceptions(response.data.exceptions);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put("/api/platform/settings", settings);
      setSettings(response.data.settings);
      setMessage({ type: "success", text: "Rregullat u ruajtën." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function addException(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post(
        "/api/platform/settings/email-exceptions",
        form,
      );
      setExceptions((items) => [...items, response.data.exception]);
      setForm({ emailDomain: "", websiteDomain: "", reason: "" });
      setMessage({ type: "success", text: "Përjashtimi u shtua." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function removeException(id) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.delete(
        `/api/platform/settings/email-exceptions/${id}`,
      );
      setExceptions((items) =>
        items.filter((item) => String(item.id) !== String(id)),
      );
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="platform-settings">
      <div className="platform-page-heading">
        <div>
          <p className="eyebrow">Politikat e platformës</p>
          <h1>Cilësimet e regjistrimit</h1>
          <p>
            Kontrolloni pranimin e kërkesave dhe rastet e veçanta të domain-eve
            institucionale.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadSettings}
          disabled={loading}
        >
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <div className="platform-settings-grid">
        <form className="platform-settings-card" onSubmit={saveSettings}>
          <div className="settings-card-heading">
            <Settings2 size={21} />
            <div>
              <h2>Rregullat bazë</h2>
              <p>Ndryshimet regjistrohen në historikun e administrimit.</p>
            </div>
          </div>
          <label className="settings-toggle">
            <span>
              <strong>Prano regjistrime të reja</strong>
              <small>Mbyllja nuk prek kërkesat ekzistuese.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.registrationsOpen}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  registrationsOpen: event.target.checked,
                }))
              }
            />
          </label>
          <label className="settings-toggle">
            <span>
              <strong>Kërko përputhjen e domain-it</strong>
              <small>Email-i duhet të lidhet me faqen zyrtare.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.requireWebsiteDomainMatch}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  requireWebsiteDomainMatch: event.target.checked,
                }))
              }
            />
          </label>
          <label className="settings-toggle">
            <span>
              <strong>Lejo ofruesit publikë të email-it</strong>
              <small>Përdoreni vetëm për demonstrime të kontrolluara.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.allowPublicEmailProviders}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  allowPublicEmailProviders: event.target.checked,
                }))
              }
            />
          </label>
          <Button type="submit" disabled={loading || saving}>
            Ruaj rregullat
          </Button>
        </form>

        <div className="platform-settings-card">
          <div className="settings-card-heading">
            <Plus size={21} />
            <div>
              <h2>Përjashtimet institucionale</h2>
              <p>Autorizoni një kombinim të veçantë domain-esh.</p>
            </div>
          </div>
          <form className="exception-form" onSubmit={addException}>
            <label>
              Domain-i i email-it
              <input
                value={form.emailDomain}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    emailDomain: event.target.value,
                  }))
                }
                placeholder="universiteti.edu"
                required
              />
            </label>
            <label>
              Domain-i i faqes <small>(opsional)</small>
              <input
                value={form.websiteDomain}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    websiteDomain: event.target.value,
                  }))
                }
                placeholder="universiteti.al"
              />
            </label>
            <label>
              Arsyeja
              <textarea
                value={form.reason}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    reason: event.target.value,
                  }))
                }
                placeholder="Shpjegoni rastin e veçantë"
                rows="3"
                required
              />
            </label>
            <Button type="submit" disabled={saving}>
              <Plus size={16} /> Shto përjashtimin
            </Button>
          </form>
          <div className="exception-list">
            {exceptions.map((exception) => (
              <article key={exception.id}>
                <div>
                  <strong>{exception.emailDomain}</strong>
                  <small>
                    {exception.websiteDomain
                      ? `Faqja: ${exception.websiteDomain}`
                      : "Vlen për çdo faqe zyrtare"}
                  </small>
                  <p>{exception.reason}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Hiq përjashtimin ${exception.emailDomain}`}
                  onClick={() => removeException(exception.id)}
                  disabled={saving}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
            {!loading && exceptions.length === 0 && (
              <p className="platform-empty">Nuk ka përjashtime aktive.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
