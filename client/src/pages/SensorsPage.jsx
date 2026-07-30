import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Box,
  Clock3,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { SensorForm } from "@/components/SensorForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { sensorTypes } from "@/validation/sensor.js";

const statusLabels = {
  online: "Online",
  offline: "Offline",
  calibration: "Në kalibrim",
  inactive: "Joaktiv",
};

const emptyOptions = { laboratories: [], zones: [], equipment: [] };

export function SensorsPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("assets.manage");
  const [sensors, setSensors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sensorType, setSensorType] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [options, setOptions] = useState(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadSensors = useCallback(
    async ({ keepMessage = false } = {}) => {
      setLoading(true);
      if (!keepMessage) setMessage({ type: "", text: "" });
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: "12",
          sort,
          direction: "asc",
        });
        if (status) parameters.set("status", status);
        if (sensorType) parameters.set("sensorType", sensorType);
        if (submittedSearch) parameters.set("search", submittedSearch);
        const response = await api.get(`/api/sensors?${parameters.toString()}`);
        setSensors(response.data.sensors);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    },
    [page, sensorType, sort, status, submittedSearch],
  );

  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  const loadOptions = useCallback(async (laboratoryId = "") => {
    setLoadingOptions(true);
    try {
      const suffix = laboratoryId
        ? `?laboratoryId=${encodeURIComponent(laboratoryId)}`
        : "";
      const response = await api.get(`/api/sensors/options${suffix}`);
      setOptions(response.data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  async function createSensor(values) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post("/api/sensors", values);
      setMessage({ type: "success", text: response.data.message });
      setShowForm(false);
      setPage(1);
      await loadSensors({ keepMessage: true });
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
    <section className="sensors-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Matjet laboratorike</p>
          <h1>Sensorët</h1>
          <p>
            Menaxhoni burimet e matjeve dhe vendosjen e tyre në laboratorët
            virtualë.
          </p>
        </div>
        <div className="laboratories-heading-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadSensors()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Rifresko
          </Button>
          {canManage && (
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus size={17} /> Sensor i ri
            </Button>
          )}
        </div>
      </div>

      <div className="laboratory-filters sensor-filters">
        <form onSubmit={submitSearch}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kërko sipas emrit ose kodit"
            aria-label="Kërko sensorët"
          />
        </form>
        <Filter
          label="Lloji"
          value={sensorType}
          onChange={(value) => {
            setSensorType(value);
            setPage(1);
          }}
          options={Object.entries(sensorTypes).map(([value, item]) => ({
            value,
            label: item.label,
          }))}
        />
        <Filter
          label="Statusi"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={Object.entries(statusLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Filter
          label="Renditja"
          value={sort}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          includeAll={false}
          options={[
            { value: "name", label: "Emri" },
            { value: "code", label: "Kodi" },
            { value: "sensorType", label: "Lloji" },
            { value: "status", label: "Statusi" },
            { value: "updatedAt", label: "Përditësimi" },
          ]}
        />
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="equipment-card-grid" aria-label="Po ngarkohen sensorët">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="laboratory-card-skeleton" key={index} />
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <div className="workspace-onboarding">
          <span>
            <RadioTower size={25} />
          </span>
          <div>
            <h2>Nuk u gjet asnjë sensor</h2>
            <p>
              {submittedSearch || status || sensorType
                ? "Ndryshoni kërkimin ose filtrat."
                : canManage
                  ? "Shtoni sensorin e parë të një laboratori."
                  : "Nuk ka sensorë në laboratorët që ju janë caktuar."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="equipment-card-grid">
            {sensors.map((sensor) => (
              <article className="equipment-card sensor-card" key={sensor.id}>
                <header>
                  <span className="laboratory-code">{sensor.code}</span>
                  <span className={`status-badge status-${sensor.status}`}>
                    {statusLabels[sensor.status]}
                  </span>
                </header>
                <h2>{sensor.name}</h2>
                <p>
                  {sensorTypes[sensor.sensorType]?.label} · {sensor.unit}
                </p>
                <dl>
                  <div>
                    <dt>
                      <Box size={15} /> Laboratori
                    </dt>
                    <dd>{sensor.laboratoryName}</dd>
                  </div>
                  <div>
                    <dt>
                      <Activity size={15} /> Lidhja
                    </dt>
                    <dd>{sensor.equipmentName || "Pa pajisje"}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock3 size={15} /> Mostrimi
                    </dt>
                    <dd>{sensor.samplingIntervalSeconds} sek.</dd>
                  </div>
                </dl>
                <Link
                  className="equipment-card-link"
                  to={`/aplikacioni/sensoret/${sensor.id}`}
                >
                  Hap detajet
                </Link>
              </article>
            ))}
          </div>
          {pagination?.pages > 1 && (
            <nav
              className="laboratory-pagination"
              aria-label="Faqet e sensorëve"
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
            className="workspace-modal sensor-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sensor-form-title"
          >
            <header>
              <div>
                <span>Burim i ri matjeje</span>
                <h2 id="sensor-form-title">Krijo sensor</h2>
              </div>
              <button
                type="button"
                aria-label="Mbyll formularin"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </header>
            <SensorForm
              options={options}
              loadingOptions={loadingOptions}
              saving={saving}
              onLaboratoryChange={loadOptions}
              onSubmit={createSensor}
              onCancel={() => setShowForm(false)}
            />
          </section>
        </div>
      )}
    </section>
  );
}

function Filter({ label, value, onChange, options, includeAll = true }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {includeAll && <option value="">Të gjitha</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
