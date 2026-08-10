import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Building2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { LaboratoryForm } from "@/components/LaboratoryForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  maintenance: "Në mirëmbajtje",
};

export function LaboratoriesPage() {
  const user = useAuthStore((state) => state.user);
  const canCreate = user?.permissions?.includes("laboratories.create");
  const [laboratories, setLaboratories] = useState([]);
  const [responsibleUsers, setResponsibleUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [archiveMode, setArchiveMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResponsibleUsers, setLoadingResponsibleUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const closeForm = useCallback(() => setShowForm(false), []);
  const formDialogRef = useAccessibleDialog(showForm, closeForm);

  const loadLaboratories = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        });
        if (status && !archiveMode) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const endpoint = archiveMode
          ? "/api/laboratories/archived"
          : "/api/laboratories";
        const response = await api.get(`${endpoint}?${parameters.toString()}`);
        setLaboratories(response.data.laboratories);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [archiveMode, page, status, submittedSearch],
  );

  useEffect(() => {
    loadLaboratories();
  }, [loadLaboratories]);

  useEffect(() => {
    if (!canCreate) return;
    setLoadingResponsibleUsers(true);
    api
      .get("/api/laboratories/responsible-users")
      .then((response) => setResponsibleUsers(response.data.users ?? []))
      .catch(() => setResponsibleUsers([]))
      .finally(() => setLoadingResponsibleUsers(false));
  }, [canCreate]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  async function createLaboratory(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post("/api/laboratories", values);
      setMessage({ type: "success", text: response.data.message });
      setShowForm(false);
      setPage(1);
      await loadLaboratories({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function restoreLaboratory(laboratoryId) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.patch(
        `/api/laboratories/${laboratoryId}/restore`,
      );
      setMessage({ type: "success", text: response.data.message });
      await loadLaboratories({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function toggleArchive() {
    setArchiveMode((current) => !current);
    setStatus("");
    setPage(1);
    setMessage({ type: "", text: "" });
  }

  return (
    <section className="laboratories-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Hapësirat akademike</p>
          <h1>Laboratorët</h1>
          <p>
            Shikoni dhe menaxhoni laboratorët që lejohen nga roli dhe caktimet
            tuaja.
          </p>
        </div>
        <div className="laboratories-heading-actions">
          {canCreate && (
            <Button type="button" variant="outline" onClick={toggleArchive}>
              {archiveMode ? <Building2 size={16} /> : <Archive size={16} />}
              {archiveMode ? "Laboratorët aktivë" : "Arkivi"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => loadLaboratories()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          {canCreate && !archiveMode && (
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus size={17} /> Laborator i ri
            </Button>
          )}
        </div>
      </div>

      <div className="laboratory-filters">
        <form onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kërko sipas emrit, kodit ose ndërtesës"
            aria-label="Kërko laboratorët"
          />
        </form>
        {!archiveMode && (
          <label>
            <span>Statusi</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Të gjitha</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Joaktiv</option>
              <option value="maintenance">Në mirëmbajtje</option>
            </select>
          </label>
        )}
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      {loading ? (
        <div
          className="laboratory-card-grid"
          aria-label="Po ngarkohen laboratorët"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div className="laboratory-card-skeleton" key={index} />
          ))}
        </div>
      ) : laboratories.length === 0 ? (
        <div className="workspace-onboarding">
          <span>
            <Building2 size={25} />
          </span>
          <div>
            <h2>Nuk u gjet asnjë laborator</h2>
            <p>
              {submittedSearch || status
                ? "Ndryshoni kërkimin ose filtrin e statusit."
                : archiveMode
                  ? "Nuk ka laboratorë të arkivuar."
                  : canCreate
                    ? "Krijoni laboratorin e parë për të filluar konfigurimin."
                    : "Nuk keni ende laboratorë të caktuar për këtë llogari."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="laboratory-card-grid">
            {laboratories.map((laboratory) => (
              <article className="laboratory-card" key={laboratory.id}>
                <header>
                  <span className="laboratory-code">{laboratory.code}</span>
                  <span
                    className={`status-badge status-${archiveMode ? "archived" : laboratory.status}`}
                  >
                    {archiveMode
                      ? "I arkivuar"
                      : statusLabels[laboratory.status]}
                  </span>
                </header>
                <h2>{laboratory.name}</h2>
                <p>{laboratory.faculty}</p>
                <dl>
                  <div>
                    <dt>
                      <MapPin size={15} /> Vendndodhja
                    </dt>
                    <dd>
                      {laboratory.building}, kati {laboratory.floor}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Users size={15} /> Kapaciteti
                    </dt>
                    <dd>{laboratory.capacity} persona</dd>
                  </div>
                </dl>
                {archiveMode ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => restoreLaboratory(laboratory.id)}
                    disabled={saving}
                  >
                    <ArchiveRestore size={15} /> Rikthe laboratorin
                  </Button>
                ) : (
                  <Link
                    className="laboratory-open-link"
                    to={`/aplikacioni/laboratoret/${laboratory.id}`}
                  >
                    Hap laboratorin
                  </Link>
                )}
              </article>
            ))}
          </div>

          {pagination?.pages > 1 && (
            <nav
              className="laboratory-pagination"
              aria-label="Faqet e laboratorëve"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Para
              </Button>
              <span>
                Faqja {pagination.page} nga {pagination.pages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === pagination.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Pas
              </Button>
            </nav>
          )}
        </>
      )}

      {showForm && (
        <div className="workspace-modal-backdrop">
          <section
            ref={formDialogRef}
            className="workspace-modal laboratory-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="laboratory-form-title"
          >
            <header>
              <div>
                <span>Konfigurimi bazë</span>
                <h2 id="laboratory-form-title">Krijo laborator</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </header>
            <LaboratoryForm
              onSubmit={createLaboratory}
              onCancel={closeForm}
              saving={saving}
              submitLabel="Krijo laboratorin"
              responsibleUsers={responsibleUsers}
              loadingResponsibleUsers={loadingResponsibleUsers}
            />
          </section>
        </div>
      )}
    </section>
  );
}
