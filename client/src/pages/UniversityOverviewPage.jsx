import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Activity, Building2, CircleAlert, Cpu, RefreshCw, ShieldCheck, Users, Zap } from "lucide-react";
import { api } from "@/api/client.js";
import { connectDashboardRealtime } from "@/api/realtime.js";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const DashboardOperationalPanels = lazy(() =>
  import("@/components/DashboardOperationalPanels.jsx").then((module) => ({ default: module.DashboardOperationalPanels })),
);

const metricDefinitions = [
  { key: "laboratories", label: "Laboratorë", icon: Building2 },
  { key: "activeEquipment", label: "Pajisje aktive", icon: Cpu },
  { key: "onlineSensors", label: "Sensorë online", icon: Activity },
  { key: "activeAlerts", label: "Alarme aktive", icon: CircleAlert, alert: true },
  { key: "currentOccupancy", label: "Persona aktualisht", icon: Users },
  {
    key: "currentPowerWatts",
    label: "Konsum aktual",
    icon: Zap,
    format: (value) => value >= 1000
      ? `${new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 2 }).format(value / 1000)} kW`
      : `${new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 0 }).format(value)} W`,
  },
];

const formatNumber = (value) => new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 2 }).format(value);
const formatDate = (value) => new Intl.DateTimeFormat("sq-AL", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

function DashboardLoading() {
  return (
    <div className="dashboard-loading-grid" aria-label="Po ngarkohen treguesit">
      {metricDefinitions.map((metric) => <LoadingSkeleton key={metric.key} rows={3} />)}
    </div>
  );
}

function getRealtimeBadge(status) {
  if (status === "connected") return { tone: "success", label: "Lidhur në kohë reale" };
  if (status === "connecting") return { tone: "warning", label: "Duke u lidhur" };
  return { tone: "danger", label: "Lidhja live u ndërpre" };
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
      const response = await api.get(`/api/dashboard/summary?${parameters.toString()}`);
      setSummary(response.data.summary);
      if (!laboratoryId) setLaboratoryOptions(response.data.summary.laboratories ?? []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [hours, laboratoryId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

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

  const realtimeBadge = getRealtimeBadge(realtimeStatus);
  const infrastructureHealth = summary?.metrics.infrastructureHealth ?? 0;
  const faultEquipment = summary?.metrics.faultEquipment ?? 0;
  const plannedMaintenance = summary?.metrics.plannedMaintenance ?? 0;

  return (
    <section className="workspace-overview">
      <PageHeader
        eyebrow="Përmbledhja operative"
        title={`Mirë se vini, ${user?.fullName?.split(" ")[0] ?? ""}`}
        description={`Pamja aktuale e laboratorëve të ${user?.university.name}, e kufizuar sipas rolit dhe lejeve tuaja.`}
        actions={(
          <Button type="button" variant="outline" size="sm" onClick={loadSummary} disabled={loading}>
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko
          </Button>
        )}
      />

      <div className="dashboard-command-bar" aria-label="Filtrat e dashboard-it">
        <div className="dashboard-filter-fields">
          <label>
            <span>Laboratori</span>
            <select value={laboratoryId} onChange={(event) => setLaboratoryId(event.target.value)} disabled={loading && !summary}>
              <option value="">Të gjithë laboratorët</option>
              {laboratoryOptions.map((laboratory) => (
                <option key={laboratory.id} value={laboratory.id}>{laboratory.name} ({laboratory.code})</option>
              ))}
            </select>
          </label>
          <label>
            <span>Periudha</span>
            <select value={hours} onChange={(event) => setHours(event.target.value)} disabled={loading && !summary}>
              <option value="6">6 orët e fundit</option>
              <option value="24">24 orët e fundit</option>
              <option value="168">7 ditët e fundit</option>
            </select>
          </label>
        </div>
        {summary && (
          <div className="dashboard-live-context">
            <StatusBadge tone={realtimeBadge.tone}>{realtimeBadge.label}</StatusBadge>
            {summary.containsSimulatedData && <StatusBadge tone="info">Përmban simulim</StatusBadge>}
            <small>Përditësuar {formatDate(summary.lastUpdatedAt)}</small>
          </div>
        )}
      </div>

      {message && (
        <div className="dashboard-error" role="alert">
          <div><strong>Përmbledhja nuk mund të ngarkohet</strong><p>{message}</p></div>
          <Button type="button" variant="outline" size="sm" onClick={loadSummary}>Provo përsëri</Button>
        </div>
      )}

      {loading && !summary ? <DashboardLoading /> : summary?.metrics.laboratories === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nuk ka ende laboratorë aktivë"
          description="Treguesit shfaqen sapo universiteti të konfigurojë laboratorin e parë. Të dhënat e universitetit mbeten të izoluara nga tenantët e tjerë."
          action={<StatusBadge tone="success"><ShieldCheck size={13} /> Izolim i të dhënave aktiv</StatusBadge>}
        />
      ) : summary ? (
        <>
          <div className="dashboard-metric-grid is-primary">
            {metricDefinitions.map(({ key, label, icon: Icon, format, alert }) => {
              const value = summary.metrics[key] ?? 0;
              const isAlerting = alert && value > 0;
              return (
                <article className={`dashboard-metric-card${isAlerting ? " has-alert" : ""}`} key={key}>
                  <span className="dashboard-metric-icon"><Icon size={19} /></span>
                  <div><small>{label}</small><strong>{format ? format(value) : formatNumber(value)}</strong></div>
                </article>
              );
            })}
          </div>

          <section className="dashboard-health-strip" aria-label="Gjendja e infrastrukturës">
            <div>
              <span>Shëndeti i infrastrukturës</span>
              <strong>{infrastructureHealth}%</strong>
            </div>
            <div className="health-progress" role="progressbar" aria-label="Shëndeti i infrastrukturës"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow={infrastructureHealth}>
              <span style={{ width: `${infrastructureHealth}%` }} />
            </div>
            <dl>
              <div><dt>Pajisje me defekt</dt><dd>{faultEquipment}</dd></div>
              <div><dt>Mirëmbajtje të planifikuara</dt><dd>{plannedMaintenance}</dd></div>
            </dl>
          </section>

          <Suspense fallback={<LoadingSkeleton rows={6} aria-label="Po ngarkohen grafiqet dhe aktivitetet" />}>
            <DashboardOperationalPanels summary={summary} />
          </Suspense>
        </>
      ) : null}
    </section>
  );
}
