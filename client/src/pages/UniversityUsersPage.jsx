import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const statusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  invited: "I ftuar",
};
const roleLabels = {
  university_admin: "Administrator universiteti",
  lab_manager: "Menaxher laboratori",
  technician: "Teknik",
  academic_staff: "Personel akademik",
  observer: "Vëzhgues",
};
const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  status: "active",
  password: "",
  roles: [],
  laboratoryIds: [],
};

export function UniversityUsersPage() {
  const [users, setUsers] = useState([]);
  const [options, setOptions] = useState({ roles: [], laboratories: [] });
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadUsers = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({ page: "1", pageSize: "50" });
        if (submittedSearch) parameters.set("search", submittedSearch);
        if (status) parameters.set("status", status);
        const response = await api.get(`/api/university/users?${parameters}`);
        setUsers(response.data.users);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [status, submittedSearch],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  useEffect(() => {
    api
      .get("/api/university/users/options")
      .then((response) => setOptions(response.data.options))
      .catch((error) => setMessage({ type: "error", text: error.message }));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }
  function openEdit(user) {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? "",
      jobTitle: user.jobTitle ?? "",
      roles: user.roles,
      laboratoryIds: user.laboratories.map((item) => item.id),
    });
    setShowForm(true);
  }
  async function openProfile(userId) {
    setLoadingProfile(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.get(`/api/university/users/${userId}`);
      setProfile(response.data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoadingProfile(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        ...form,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle || undefined,
      };
      const response = editing
        ? await api.put(`/api/university/users/${editing.id}`, {
            fullName: payload.fullName,
            email: payload.email,
            phone: payload.phone,
            jobTitle: payload.jobTitle,
            roles: payload.roles,
            laboratoryIds: payload.laboratoryIds,
          })
        : await api.post("/api/university/users", payload);
      setMessage({ type: "success", text: response.data.message });
      setShowForm(false);
      await loadUsers({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }
  async function changeStatus(user) {
    try {
      const nextStatus = user.status === "active" ? "inactive" : "active";
      const response = await api.patch(
        `/api/university/users/${user.id}/status`,
        { status: nextStatus },
      );
      setMessage({ type: "success", text: response.data.message });
      await loadUsers({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }
  function submitSearch(event) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <section className="university-users-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Ekipi i universitetit</p>
          <h1>Përdoruesit</h1>
          <p>Menaxhoni profilet, rolet dhe qasjen në laboratorë.</p>
        </div>
        <div className="laboratories-heading-actions">
          <Button
            variant="outline"
            onClick={() => loadUsers()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          <Button onClick={openCreate}>
            <Plus size={17} /> Përdorues i ri
          </Button>
        </div>
      </div>
      <div className="university-user-filters">
        <form onSubmit={submitSearch}>
          <Search size={17} />
          <input
            aria-label="Kërko përdoruesit"
            placeholder="Kërko emër, email ose pozitë"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <label>
          <span>Statusi</span>
          <select
            aria-label="Filtro statusin"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Të gjithë</option>
            <option value="active">Aktivë</option>
            <option value="inactive">Joaktivë</option>
            <option value="invited">Të ftuar</option>
          </select>
        </label>
      </div>
      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}
      {loading ? (
        <div className="maintenance-loading">Po ngarkohen përdoruesit…</div>
      ) : users.length ? (
        <div className="university-users-list">
          {users.map((user) => (
            <article className="university-user-row" key={user.id}>
              <div className="university-user-identity">
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                </div>
              </div>
              <div>
                <span>Pozita</span>
                <strong>{user.jobTitle || "—"}</strong>
              </div>
              <div>
                <span>Rolet</span>
                <strong>
                  {user.roles
                    .map((role) => roleLabels[role] ?? role)
                    .join(", ")}
                </strong>
              </div>
              <div>
                <span>Laboratorët</span>
                <strong>
                  {user.laboratories.map((item) => item.name).join(", ") ||
                    "Pa caktim"}
                </strong>
              </div>
              <span className={`status-badge status-${user.status}`}>
                {statusLabels[user.status]}
              </span>
              <div className="university-user-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openProfile(user.id)}
                  disabled={loadingProfile}
                >
                  <Eye size={15} /> Shiko
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(user)}
                >
                  <Pencil size={15} /> Ndrysho
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(user)}
                >
                  {user.status === "active" ? (
                    <UserX size={15} />
                  ) : (
                    <UserCheck size={15} />
                  )}
                  {user.status === "active" ? "Çaktivizo" : "Aktivizo"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-onboarding">
          <span>
            <ShieldCheck size={25} />
          </span>
          <div>
            <h2>Nuk u gjet asnjë përdorues</h2>
            <p>Ndryshoni filtrat ose krijoni përdoruesin e parë.</p>
          </div>
        </div>
      )}
      {showForm && (
        <div className="workspace-modal-backdrop" role="presentation">
          <section
            className="workspace-modal university-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <header>
              <div>
                <p className="eyebrow">Qasje tenant-safe</p>
                <h2 id="user-form-title">
                  {editing ? "Ndrysho përdoruesin" : "Përdorues i ri"}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mbyll formularin"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </Button>
            </header>
            <form onSubmit={save}>
              <div className="university-user-form-grid">
                <label>
                  <span>Emri i plotë</span>
                  <input
                    required
                    minLength="3"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm({ ...form, fullName: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Telefoni</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Pozita</span>
                  <input
                    value={form.jobTitle}
                    onChange={(event) =>
                      setForm({ ...form, jobTitle: event.target.value })
                    }
                  />
                </label>
                {!editing && (
                  <>
                    <label>
                      <span>Statusi</span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm({ ...form, status: event.target.value })
                        }
                      >
                        <option value="active">Aktiv</option>
                        <option value="invited">I ftuar</option>
                      </select>
                    </label>
                    {form.status === "active" && (
                      <label>
                        <span>Fjalëkalimi fillestar</span>
                        <input
                          type="password"
                          required
                          minLength="12"
                          value={form.password}
                          onChange={(event) =>
                            setForm({ ...form, password: event.target.value })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
              <fieldset>
                <legend>Rolet</legend>
                <div className="university-user-checks">
                  {options.roles.map((role) => (
                    <label key={role.code}>
                      <input
                        type="checkbox"
                        checked={form.roles.includes(role.code)}
                        onChange={() =>
                          setForm({
                            ...form,
                            roles: toggle(form.roles, role.code),
                          })
                        }
                      />
                      <span>
                        <strong>{role.name}</strong>
                        <small>{role.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Laboratorët e caktuar</legend>
                <div className="university-user-checks">
                  {options.laboratories.map((laboratory) => (
                    <label key={laboratory.id}>
                      <input
                        type="checkbox"
                        checked={form.laboratoryIds.includes(laboratory.id)}
                        onChange={() =>
                          setForm({
                            ...form,
                            laboratoryIds: toggle(
                              form.laboratoryIds,
                              laboratory.id,
                            ),
                          })
                        }
                      />
                      <span>
                        <strong>{laboratory.name}</strong>
                        <small>{laboratory.code}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <footer>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Anulo
                </Button>
                <Button disabled={saving || !form.roles.length}>
                  {saving
                    ? "Po ruhet…"
                    : editing
                      ? "Ruaj ndryshimet"
                      : "Krijo përdoruesin"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {profile && (
        <div className="workspace-modal-backdrop" role="presentation">
          <section
            className="workspace-modal university-user-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-profile-title"
          >
            <header>
              <div>
                <p className="eyebrow">Profili i përdoruesit</p>
                <h2 id="user-profile-title">{profile.user.fullName}</h2>
                <p>{profile.user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mbyll profilin"
                onClick={() => setProfile(null)}
              >
                <X size={18} />
              </Button>
            </header>
            <div className="university-user-profile-grid">
              <div>
                <span>Statusi</span>
                <strong>{statusLabels[profile.user.status]}</strong>
              </div>
              <div>
                <span>Pozita</span>
                <strong>{profile.user.jobTitle || "—"}</strong>
              </div>
              <div>
                <span>Telefoni</span>
                <strong>{profile.user.phone || "—"}</strong>
              </div>
              <div>
                <span>Hyrja e fundit</span>
                <strong>{dateTime(profile.user.lastLoginAt)}</strong>
              </div>
            </div>
            <section className="university-user-profile-access">
              <div>
                <span>Rolet</span>
                <p>
                  {profile.user.roles
                    .map((role) => roleLabels[role] ?? role)
                    .join(", ")}
                </p>
              </div>
              <div>
                <span>Laboratorët</span>
                <p>
                  {profile.user.laboratories
                    .map((item) => item.name)
                    .join(", ") || "Pa caktim"}
                </p>
              </div>
            </section>
            <section className="university-user-timeline">
              <div className="university-user-timeline-heading">
                <div>
                  <h3>Aktiviteti i fundit</h3>
                  <p>Veprimet e përdoruesit dhe ndryshimet administrative.</p>
                </div>
                <Clock3 size={18} />
              </div>
              {profile.activity.length ? (
                <ol>
                  {profile.activity.map((item) => (
                    <li key={item.id}>
                      <span>
                        <Clock3 size={14} />
                      </span>
                      <div>
                        <strong>{activityTitle(item.action)}</strong>
                        <p>{item.description}</p>
                        <small>
                          {item.actorName} · {dateTime(item.createdAt)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="university-user-no-activity">
                  Nuk ka ende aktivitet të regjistruar.
                </p>
              )}
            </section>
          </section>
        </div>
      )}
    </section>
  );
}

function toggle(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function dateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activityTitle(action) {
  return (
    {
      "auth.login": "Hyrje në sistem",
      "auth.logout": "Dalje nga sistemi",
      "university.user.created": "Përdoruesi u krijua",
      "university.user.updated": "Profili u përditësua",
      "university.user.deactivated": "Përdoruesi u çaktivizua",
      "university.user.reactivated": "Përdoruesi u riaktivizua",
    }[action] ?? "Aktivitet i regjistruar"
  );
}
