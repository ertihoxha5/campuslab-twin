import { useEffect, useRef, useState } from "react";
import { Building2, Globe2, ImagePlus, Mail, MapPin, Save } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const emptyProfile = {
  name: "",
  acronym: "",
  institutionType: "public",
  city: "",
  address: "",
  officialWebsite: "",
  description: "",
  representativeName: "",
  representativeEmail: "",
  logoFileId: null,
};

export function UniversitySettingsPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const logoInput = useRef(null);

  useEffect(() => {
    api
      .get("/api/university/profile")
      .then((response) =>
        setProfile({
          ...emptyProfile,
          ...response.data.profile,
          description: response.data.profile.description ?? "",
        }),
      )
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  async function refreshBranding() {
    const response = await api.post("/api/auth/session");
    if (response.data.user) setSession(response.data.user);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.put("/api/university/profile", {
        name: profile.name,
        acronym: profile.acronym,
        institutionType: profile.institutionType,
        city: profile.city,
        address: profile.address,
        officialWebsite: profile.officialWebsite,
        description: profile.description || undefined,
        representativeName: profile.representativeName,
        representativeEmail: profile.representativeEmail,
      });
      setProfile({
        ...profile,
        ...response.data.profile,
        description: response.data.profile.description ?? "",
      });
      await refreshBranding();
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage({ type: "", text: "" });
    try {
      const body = new FormData();
      body.set("logo", file);
      const response = await api.post("/api/university/profile/logo", body);
      setProfile((current) => ({
        ...current,
        logoFileId: response.data.logo.id,
      }));
      await refreshBranding();
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="university-settings-page">
      <div className="workspace-page-heading">
        <p className="eyebrow">Identiteti institucional</p>
        <h1>Cilësimet e universitetit</h1>
        <p>Përditësoni profilin dhe branding-un që shfaqet në workspace.</p>
      </div>
      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}
      {loading ? (
        <div className="maintenance-loading">Po ngarkohet profili…</div>
      ) : (
        <div className="university-settings-layout">
          <aside className="university-branding-card">
            <div className="university-branding-logo">
              {profile.logoFileId ? (
                <img
                  src={`/api/files/${profile.logoFileId}`}
                  alt={`Logoja e ${profile.name}`}
                />
              ) : (
                <span>{profile.acronym.slice(0, 3)}</span>
              )}
            </div>
            <h2>{profile.name}</h2>
            <p>
              {profile.acronym} ·{" "}
              {profile.institutionType === "public"
                ? "Universitet publik"
                : "Universitet privat"}
            </p>
            <input
              ref={logoInput}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadLogo}
              aria-label="Zgjidh logon"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInput.current?.click()}
              disabled={uploading}
            >
              <ImagePlus size={16} />{" "}
              {uploading ? "Po ngarkohet…" : "Ndrysho logon"}
            </Button>
            <small>JPG, PNG ose WebP · maksimumi 2 MB</small>
          </aside>
          <form className="university-profile-form" onSubmit={saveProfile}>
            <header>
              <div>
                <h2>Profili institucional</h2>
                <p>Këto të dhëna përdoren në navigim dhe raporte.</p>
              </div>
              <Building2 size={19} />
            </header>
            <div className="university-profile-form-grid">
              <label>
                <span>Emri zyrtar</span>
                <input
                  required
                  minLength="3"
                  value={profile.name}
                  onChange={(event) =>
                    setProfile({ ...profile, name: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Akronimi</span>
                <input
                  required
                  minLength="2"
                  maxLength="30"
                  value={profile.acronym}
                  onChange={(event) =>
                    setProfile({ ...profile, acronym: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Lloji i institucionit</span>
                <select
                  value={profile.institutionType}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      institutionType: event.target.value,
                    })
                  }
                >
                  <option value="public">Publik</option>
                  <option value="private">Privat</option>
                </select>
              </label>
              <label>
                <span>Qyteti</span>
                <div className="settings-input-icon">
                  <MapPin size={15} />
                  <input
                    required
                    value={profile.city}
                    onChange={(event) =>
                      setProfile({ ...profile, city: event.target.value })
                    }
                  />
                </div>
              </label>
              <label className="settings-field-wide">
                <span>Adresa</span>
                <input
                  required
                  value={profile.address}
                  onChange={(event) =>
                    setProfile({ ...profile, address: event.target.value })
                  }
                />
              </label>
              <label className="settings-field-wide">
                <span>Faqja zyrtare</span>
                <div className="settings-input-icon">
                  <Globe2 size={15} />
                  <input
                    type="url"
                    required
                    value={profile.officialWebsite}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        officialWebsite: event.target.value,
                      })
                    }
                  />
                </div>
              </label>
              <label>
                <span>Përfaqësuesi</span>
                <input
                  required
                  value={profile.representativeName}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      representativeName: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Email-i i përfaqësuesit</span>
                <div className="settings-input-icon">
                  <Mail size={15} />
                  <input
                    type="email"
                    required
                    value={profile.representativeEmail}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        representativeEmail: event.target.value,
                      })
                    }
                  />
                </div>
              </label>
              <label className="settings-field-wide">
                <span>Përshkrimi</span>
                <textarea
                  rows="5"
                  maxLength="5000"
                  value={profile.description}
                  onChange={(event) =>
                    setProfile({ ...profile, description: event.target.value })
                  }
                />
              </label>
            </div>
            <footer>
              <Button disabled={saving}>
                <Save size={16} /> {saving ? "Po ruhet…" : "Ruaj profilin"}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
