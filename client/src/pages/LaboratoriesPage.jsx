import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const statusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  maintenance: "Në mirëmbajtje",
};

const laboratorySchema = z.object({
  name: z.string().trim().min(2, "Shkruani emrin e laboratorit."),
  code: z
    .string()
    .trim()
    .min(2, "Shkruani kodin e laboratorit.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kodi mund të përmbajë vetëm shkronja, numra, - dhe _.",
    ),
  faculty: z.string().trim().min(2, "Shkruani fakultetin."),
  building: z.string().trim().min(1, "Shkruani ndërtesën."),
  floor: z.string().trim().min(1, "Shkruani katin."),
  capacity: z.coerce
    .number({ error: "Shkruani kapacitetin." })
    .int("Kapaciteti duhet të jetë numër i plotë.")
    .min(1, "Kapaciteti duhet të jetë së paku 1."),
  status: z.enum(["active", "inactive", "maintenance"]),
  description: z.string().trim().max(5000).optional(),
});

const defaultValues = {
  name: "",
  code: "",
  faculty: "",
  building: "",
  floor: "",
  capacity: 20,
  status: "active",
  description: "",
};

export function LaboratoriesPage() {
  const user = useAuthStore((state) => state.user);
  const canCreate = user?.permissions?.includes("laboratories.create");
  const [laboratories, setLaboratories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(laboratorySchema),
    defaultValues,
  });

  const loadLaboratories = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        });
        if (status) parameters.set("status", status);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(
          `/api/laboratories?${parameters.toString()}`,
        );
        setLaboratories(response.data.laboratories);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [page, status, submittedSearch],
  );

  useEffect(() => {
    loadLaboratories();
  }, [loadLaboratories]);

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
      reset(defaultValues);
      setPage(1);
      await loadLaboratories({ keepMessage: true });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
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
          <Button
            type="button"
            variant="outline"
            onClick={() => loadLaboratories()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          {canCreate && (
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
                  <span className={`status-badge status-${laboratory.status}`}>
                    {statusLabels[laboratory.status]}
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
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleSubmit(createLaboratory)}>
              <div className="laboratory-form-grid">
                <FormField
                  label="Emri"
                  error={errors.name?.message}
                  input={<input {...register("name")} />}
                />
                <FormField
                  label="Kodi"
                  error={errors.code?.message}
                  input={
                    <input
                      {...register("code")}
                      placeholder="p.sh. LAB-KIMI-01"
                    />
                  }
                />
                <FormField
                  label="Fakulteti"
                  error={errors.faculty?.message}
                  input={<input {...register("faculty")} />}
                />
                <FormField
                  label="Ndërtesa"
                  error={errors.building?.message}
                  input={<input {...register("building")} />}
                />
                <FormField
                  label="Kati"
                  error={errors.floor?.message}
                  input={<input {...register("floor")} />}
                />
                <FormField
                  label="Kapaciteti"
                  error={errors.capacity?.message}
                  input={
                    <input type="number" min="1" {...register("capacity")} />
                  }
                />
                <FormField
                  label="Statusi"
                  error={errors.status?.message}
                  input={
                    <select {...register("status")}>
                      <option value="active">Aktiv</option>
                      <option value="inactive">Joaktiv</option>
                      <option value="maintenance">Në mirëmbajtje</option>
                    </select>
                  }
                />
                <FormField
                  className="laboratory-form-wide"
                  label="Përshkrimi"
                  error={errors.description?.message}
                  input={<textarea rows="4" {...register("description")} />}
                />
              </div>
              <footer>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Anulo
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Po ruhet…" : "Krijo laboratorin"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function FormField({ label, input, error, className = "" }) {
  return (
    <label className={className}>
      <span>{label}</span>
      {input}
      {error && <small>{error}</small>}
    </label>
  );
}
