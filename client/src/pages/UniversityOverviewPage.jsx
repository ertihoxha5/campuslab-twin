import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  Building2,
  CircleAlert,
  Cpu,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { api } from "@/api/client.js";
import { connectDashboardRealtime } from "@/api/realtime.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const DashboardOperationalPanels = lazy(() =>
  import("@/components/DashboardOperationalPanels.jsx").then((module) => ({
    default: module.DashboardOperationalPanels,
  })),
);

const metricDefinitions = [
  { key: "laboratories", label: "Numri i laboratorëve", icon: Building2 },
  { key: "activeEquipment", label: "Pajisjet aktive", icon: Cpu },
  {
    key: "faultEquipment",
    label: "Pajisjet jashtë funksionit",
    icon: CircleAlert,
  },
  { key: "onlineSensors", label: "Sensorët aktivë", icon: Activity },
  { key: "activeAlerts", label: "Alarmet aktive", icon: CircleAlert },
  {
    key: "currentPowerWatts",
    label: "Konsumi aktual i energjisë",
    icon: Zap,
    format: (value) =>
      value >= 1000
        ? `${new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 2 }).format(value / 1000)} kW`
        : `${new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 0 }).format(value)} W`,
  },
  { key: "currentOccupancy", label: "Numri aktual i personave", icon: Users },
  {
    key: "plannedMaintenance",
    label: "Mirëmbajtjet e planifikuara",
    icon: Wrench,
  },
  {
    key: "infrastructureHealth",
    label: "Shëndeti i infrastrukturës",
    icon: Gauge,
    format: (value) => `${value}%`,
    health: true,
  },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 2 }).format(value);

const formatDate = (value) =>
  new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));

function DashboardLoading() {
  return (
    <div className="dashboard-metric-grid" aria-label="Po ngarkohen treguesit">
      {metricDefinitions.map((metric) => (
        <div className="dashboard-metric-skeleton" key={metric.key} />
      ))}
    </div>
  );
}

export function UniversityOverviewPage() {
  const user = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState(null);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [laboratoryOptions, setLaboratoryOptions] = useState([]);
  const [hours, setHours] = useState("24");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const realtimeRefreshTimer = useRef(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const parameters = new URLSearchParams({ hours });
      if (laboratoryId) parameters.set("laboratoryId", laboratoryId);
      const response = await api.get(
        `/api/dashboard/summary?${parameters.toString()}`,
      );
      setSummary(response.data.summary);
      if (!laboratoryId) {
        setLaboratoryOptions(response.data.summary.laboratories ?? []);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [hours, laboratoryId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const scheduleRefresh = () => {
      window.clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = window.setTimeout(loadSummary, 300);
    };
    const disconnect = connectDashboardRealtime({
      laboratoryId,
      onOperationalChange: scheduleRefresh,
      onConnectionChange: setRealtimeStatus,
    });

    return () => {
      window.clearTimeout(realtimeRefreshTimer.current);
      disconnect();
    };
  }, [laboratoryId, loadSummary]);

  return (
    <section className="workspace-overview">
      <div className="dashboard-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Përmbledhja operative</p>
          <h1>Mirë se vini, {user?.fullName?.split(" ")[0]}</h1>
          <p>
            Gjendja aktuale e laboratorëve të {user?.university.name}, sipas
            qasjes së rolit tuaj.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadSummary}
          disabled={loading}
        >
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>

      <div className="dashboard-filters" aria-label="Filtrat e dashboard-it">
        <label>
          <span>Laboratori</span>
          <select
            value={laboratoryId}
            onChange={(event) => setLaboratoryId(event.target.value)}
            disabled={loading && !summary}
          >
            <option value="">Të gjithë laboratorët</option>
            {laboratoryOptions.map((laboratory) => (
              <option key={laboratory.id} value={laboratory.id}>
                {laboratory.name} ({laboratory.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Intervali i energjisë</span>
          <select
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            disabled={loading && !summary}
          >
            <option value="6">6 orët e fundit</option>
            <option value="24">24 orët e fundit</option>
            <option value="168">7 ditët e fundit</option>
          </select>
        </label>
      </div>

      {message && (
        <div className="dashboard-error" role="alert">
          <div>
            <strong>Përmbledhja nuk mund të ngarkohet</strong>
            <p>{message}</p>
          </div>
          <Button type="button" variant="outline" onClick={loadSummary}>
            Provo përsëri
          </Button>
        </div>
      )}

      {loading ? (
        <DashboardLoading />
      ) : summary?.metrics.laboratories === 0 ? (
        <div className="workspace-onboarding">
          <span>
            <Building2 size={25} />
          </span>
          <div>
            <h2>Nuk ka ende laboratorë aktivë</h2>
            <p>
              Treguesit do të llogariten sapo universiteti të konfigurojë
              laboratorin e parë.
            </p>
          </div>
          <div className="tenant-security-note">
            <ShieldCheck size={18} />
            <span>
              Kjo përmbledhje përmban vetëm të dhënat e universitetit tuaj.
            </span>
          </div>
        </div>
      ) : summary ? (
        <>
          <div className="dashboard-meta">
            <span>Përditësuar më {formatDate(summary.lastUpdatedAt)}</span>
            <span className={`realtime-status ${realtimeStatus}`} role="status">
              <i aria-hidden="true" />
              {realtimeStatus === "connected"
                ? "Përditësim në kohë reale"
                : realtimeStatus === "connecting"
                  ? "Po lidhet në kohë reale"
                  : "Lidhja në kohë reale është ndërprerë"}
            </span>
            <span
              className={
                summary.containsSimulatedData
                  ? "data-source simulated"
                  : "data-source"
              }
            >
              {summary.containsSimulatedData
                ? "Përmban të dhëna të simuluara"
                : "Pa të dhëna të simuluara"}
            </span>
          </div>
          <div className="dashboard-metric-grid">
            {metricDefinitions.map(
              ({ key, label, icon: Icon, format, health }) => {
                const value = summary.metrics[key] ?? 0;
                return (
                  <article className="dashboard-metric-card" key={key}>
                    <span className="dashboard-metric-icon">
                      <Icon size={20} />
                    </span>
                    <div>
                      <small>{label}</small>
                      <strong>
                        {format ? format(value) : formatNumber(value)}
                      </strong>
                    </div>
                    {health && (
                      <div
                        className="health-progress"
                        role="progressbar"
                        aria-label="Shëndeti i infrastrukturës"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={value}
                      >
                        <span style={{ width: `${value}%` }} />
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </div>
          <details className="health-explanation">
            <summary>Si llogaritet shëndeti i infrastrukturës?</summary>
            <p>
              Nis nga mesatarja e shëndetit të pajisjeve dhe ulet sipas
              pajisjeve me defekt, sensorëve offline dhe alarmeve kritike
              aktive.
            </p>
          </details>
          <Suspense
            fallback={
              <p className="dashboard-panels-loading">
                Po ngarkohen grafikët dhe aktivitetet…
              </p>
            }
          >
            <DashboardOperationalPanels summary={summary} />
          </Suspense>
        </>
      ) : null}
    </section>
  );
}
