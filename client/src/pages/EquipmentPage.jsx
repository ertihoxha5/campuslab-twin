import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Cpu,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/api/client.js";
import { EquipmentForm } from "@/components/EquipmentForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  active: "Aktive",
  inactive: "Joaktive",
  fault: "Me defekt",
  maintenance: "Në mirëmbajtje",
};

const emptyOptions = { laboratories: [], zones: [], users: [] };

export function EquipmentPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("assets.manage");
  const [equipment, setEquipment] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [options, setOptions] = useState(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const closeForm = useCallback(() => setShowForm(false), []);
  const formDialogRef = useAccessibleDialog(showForm, closeForm);

  const loadEquipment = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: "12",
          sort,
          direction,
        });
        if (status) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(
          `/api/equipment?${parameters.toString()}`,
        );
        setEquipment(response.data.equipment);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [direction, page, sort, status, submittedSearch],
  );

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const loadOptions = useCallback(async (laboratoryId = "") => {
    setLoadingOptions(true);
    try {
      const suffix = laboratoryId
        ? `?laboratoryId=${encodeURIComponent(laboratoryId)}`
        : "";
      const response = await api.get(`/api/equipment/options${suffix}`);
      setOptions(response.data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  function openForm() {
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  async function createEquipment(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post("/api/equipment", values);
      setMessage({ type: "success", text: response.data.message });
      setShowForm(false);
      setPage(1);
      await loadEquipment({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  return (
    <section className="equipment-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Asetet laboratorike</p>
          <h1>Pajisjet</h1>
          <p>
            Shikoni gjendjen, shëndetin dhe vendosjen e pajisjeve në laboratorët
            tuaj.
          </p>
        </div>
        <div className="laboratories-heading-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadEquipment()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          {canManage && (
            <Button type="button" onClick={openForm}>
              <Plus size={17} /> Pajisje e re
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
            placeholder="Kërko sipas emrit, kodit, llojit ose numrit serik"
            aria-label="Kërko pajisjet"
          />
        </form>
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
            <option value="active">Aktive</option>
            <option value="inactive">Joaktive</option>
            <option value="fault">Me defekt</option>
            <option value="maintenance">Në mirëmbajtje</option>
          </select>
        </label>
        <label>
          <span>Renditja</span>
          <select
            value={`${sort}:${direction}`}
            onChange={(event) => {
              const [nextSort, nextDirection] = event.target.value.split(":");
              setSort(nextSort);
              setDirection(nextDirection);
              setPage(1);
            }}
          >
            <option value="name:asc">Emri A–Z</option>
            <option value="name:desc">Emri Z–A</option>
            <option value="healthScore:desc">Shëndeti më i lartë</option>
            <option value="healthScore:asc">Shëndeti më i ulët</option>
            <option value="updatedAt:desc">Përditësimi më i ri</option>
            <option value="code:asc">Kodi</option>
            <option value="type:asc">Lloji</option>
            <option value="status:asc">Statusi</option>
          </select>
        </label>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="equipment-card-grid" aria-label="Po ngarkohen pajisjet">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="laboratory-card-skeleton" key={index} />
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <div className="workspace-onboarding">
          <span>
            <Cpu size={25} />
          </span>
          <div>
            <h2>Nuk u gjet asnjë pajisje</h2>
            <p>
              {submittedSearch || status
                ? "Ndryshoni kërkimin ose filtrin e statusit."
                : canManage
                  ? "Shtoni pajisjen e parë të një laboratori."
                  : "Nuk ka pajisje në laboratorët që ju janë caktuar."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="equipment-card-grid">
            {equipment.map((item) => (
              <article className="equipment-card" key={item.id}>
                <header>
                  <span className="laboratory-code">{item.code}</span>
                  <span className={`status-badge status-${item.status}`}>
                    {statusLabels[item.status]}
                  </span>
                </header>
                <h2>{item.name}</h2>
                <p>
                  {[item.manufacturer, item.model]
                    .filter(Boolean)
                    .join(" · ") || item.type}
                </p>
                <dl>
                  <div>
                    <dt>
                      <MapPin size={15} /> Laboratori
                    </dt>
                    <dd>{item.laboratoryName}</dd>
                  </div>
                  <div>
                    <dt>
                      <Activity size={15} /> Shëndeti
                    </dt>
                    <dd>{Number(item.healthScore).toLocaleString("sq-AL")}%</dd>
                  </div>
                  <div>
                    <dt>
                      <Zap size={15} /> Fuqia
                    </dt>
                    <dd>
                      {item.energyRatingWatts == null
                        ? "E pacaktuar"
                        : `${Number(item.energyRatingWatts).toLocaleString(
                            "sq-AL",
                          )} W`}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="equipment-card-link"
                  to={`/aplikacioni/pajisjet/${item.id}`}
                >
                  Hap detajet
                </Link>
              </article>
            ))}
          </div>

          {pagination?.pages > 1 && (
            <nav
              className="laboratory-pagination"
              aria-label="Faqet e pajisjeve"
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
            className="workspace-modal equipment-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-form-title"
          >
            <header>
              <div>
                <span>Aset i ri</span>
                <h2 id="equipment-form-title">Krijo pajisje</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </header>
            <EquipmentForm
              options={options}
              loadingOptions={loadingOptions}
              saving={saving}
              onLaboratoryChange={loadOptions}
              onSubmit={createEquipment}
              onCancel={closeForm}
            />
          </section>
        </div>
      )}
    </section>
  );
}
