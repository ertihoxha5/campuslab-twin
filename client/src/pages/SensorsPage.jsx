import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Box,
  Clock3,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  Wifi,
  X,
} from "lucide-react";
import { api } from "@/api/client.js";
import { SensorForm } from "@/components/SensorForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { sensorTypes } from "@/validation/sensor.js";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog.js";

const statusLabels = {
  online: "Online",
  offline: "Offline",
  calibration: "Në kalibrim",
  inactive: "Joaktiv",
};

const statusTones = { online: "success", offline: "danger", calibration: "warning", inactive: "neutral" };

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
  const closeForm = useCallback(() => setShowForm(false), []);
  const formDialogRef = useAccessibleDialog(showForm, closeForm);

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
      <PageHeader
        eyebrow="Matjet laboratorike"
        title="Sensorët"
        description="Menaxhoni burimet e matjeve dhe vendosjen e tyre në laboratorët virtualë."
        meta={pagination && <StatusBadge tone="info" dot={false}>{pagination.total ?? sensors.length} sensorë gjithsej</StatusBadge>}
        actions={<>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadSensors()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko
          </Button>
          {canManage && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={17} /> Sensor i ri
            </Button>
          )}
        </>}
      />

      <section className="sensors-overview" aria-label="Përmbledhja e sensorëve">
        <div className="sensors-overview-copy">
          <span><i /> RRJETI I TELEMETRISË</span>
          <h2>Sinjale live nga çdo hapësirë laboratorike.</h2>
          <p>Mbani nën kontroll lidhjen, ritmin e matjeve dhe burimet e të dhënave.</p>
        </div>
        <div className="sensors-overview-metrics">
          <article><RadioTower size={17}/><span><strong>{pagination?.total ?? sensors.length}</strong><small>Sensorë gjithsej</small></span></article>
          <article><Wifi size={17}/><span><strong>{sensors.filter((item) => item.status === "online").length}</strong><small>Online në këtë faqe</small></span></article>
          <article><Clock3 size={17}/><span><strong>{sensors.length ? Math.round(sensors.reduce((sum, item) => sum + Number(item.samplingIntervalSeconds || 0), 0) / sensors.length) : 0}s</strong><small>Intervali mesatar</small></span></article>
        </div>
      </section>

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
        <p className={`form-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="equipment-card-grid" aria-label="Po ngarkohen sensorët">
          {Array.from({ length: 3 }, (_, index) => (
            <LoadingSkeleton rows={5} key={index} />
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <EmptyState icon={RadioTower} title="Nuk u gjet asnjë sensor"
          description={submittedSearch || status || sensorType ? "Ndryshoni kërkimin ose filtrat." : canManage ? "Shtoni sensorin e parë të një laboratori." : "Nuk ka sensorë në laboratorët që ju janë caktuar."}
          action={canManage && !submittedSearch && !status && !sensorType ? <Button type="button" size="sm" onClick={() => setShowForm(true)}><Plus size={15} /> Sensor i ri</Button> : null} />
      ) : (
        <>
          <div className="equipment-card-grid">
            {sensors.map((sensor) => (
              <article className="equipment-card sensor-card" key={sensor.id}>
                <div className={`sensor-card-signal is-${sensor.status}`} aria-hidden="true">
                  <span><RadioTower size={24}/></span>
                  <div><small>SINJALI I SENSORIT</small><strong>{sensor.status === "online" ? "Transmetim live" : statusLabels[sensor.status]}</strong></div>
                  <figure>{[8,16,11,24,14,20,9,18,12].map((height, index) => <i key={index} style={{ height: `${height}px` }}/>)}</figure>
                </div>
                <header>
                  <span className="laboratory-code">{sensor.code}</span>
                  <StatusBadge tone={statusTones[sensor.status]}>{statusLabels[sensor.status] ?? sensor.status}</StatusBadge>
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
                  <span>Hap detajet</span><ArrowUpRight size={15}/>
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
            ref={formDialogRef}
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
                onClick={closeForm}
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
              onCancel={closeForm}
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
