import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import "./AlertsPage.css";

const severityLabels = { critical: "Kritik", warning: "Paralajmërim", info: "Informues" };
const statusLabels = { new: "I ri", acknowledged: "I pranuar", in_progress: "Në trajtim", resolved: "I zgjidhur", closed: "I mbyllur" };
const toneFor = { critical: "danger", warning: "warning", info: "info" };
const scenarioNames = {
  normal: "Gjendja normale", high_temperature: "Temperatura e lartë",
  high_humidity: "Lagështia e lartë", overcapacity: "Tejkalimi i pranisë",
  high_power: "Fuqia e lartë", equipment_fault: "Defekt në pajisje",
};
const readingNames = { temperature: "Temperatura", humidity: "Lagështia", occupancy: "Prania", power: "Fuqia" };

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

export function AlertsPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [scenarios, setScenarios] = useState([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [scenariosError, setScenariosError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => {
        if (!active) return;
        const items = response.data.laboratories ?? [];
        setLaboratories(items);
        const thesisLab = items.find((item) => item.code === "LAB-AUT-01");
        if (thesisLab) setLaboratoryId(String(thesisLab.id));
      })
      .catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const parameters = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (laboratoryId) parameters.set("laboratoryId", laboratoryId);
      if (severity) parameters.set("severity", severity);
      if (status) parameters.set("status", status);
      if (submittedSearch) parameters.set("search", submittedSearch);
      const response = await api.get(`/api/alerts?${parameters}`);
      setAlerts(response.data.alerts ?? []);
      setPagination(response.meta?.pagination ?? null);
    } catch (cause) {
      setError(cause.message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [laboratoryId, page, severity, status, submittedSearch]);

  useEffect(() => { void loadAlerts(); }, [loadAlerts, refreshKey]);
  useEffect(() => {
    if (!laboratoryId) { setScenarios([]); return; }
    let active = true;
    setScenariosLoading(true);
    setScenariosError("");
    api.get(`/api/alerts/executed-scenarios?laboratoryId=${encodeURIComponent(laboratoryId)}`)
      .then((response) => { if (active) setScenarios(response.data.scenarios ?? []); })
      .catch((cause) => { if (active) { setScenarios([]); setScenariosError(cause.message); } })
      .finally(() => { if (active) setScenariosLoading(false); });
    return () => { active = false; };
  }, [laboratoryId, refreshKey]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let active = true;
    setDetailLoading(true);
    api.get(`/api/alerts/${selectedId}`)
      .then((response) => { if (active) setDetail(response.data.alert); })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  function changeFilter(setter, value) { setter(value); setPage(1); setSelectedId(null); }

  return (
    <div className="alerts-page">
      <PageHeader eyebrow="Monitorimi / Siguria" title="Alarmet"
        description="Parregullsitë e identifikuara nga sensorët dhe historiku i tyre për laboratorët e autorizuar."
        actions={<Button type="button" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={16} /> Rifresko</Button>} />

      <form className="alerts-filters" onSubmit={(event) => { event.preventDefault(); changeFilter(setSubmittedSearch, search.trim()); }}>
        <label>Laboratori<select value={laboratoryId} onChange={(event) => changeFilter(setLaboratoryId, event.target.value)}>
          <option value="">Të gjithë laboratorët</option>
          {laboratories.map((laboratory) => <option key={laboratory.id} value={laboratory.id}>{laboratory.name} ({laboratory.code})</option>)}
        </select></label>
        <label>Niveli<select value={severity} onChange={(event) => changeFilter(setSeverity, event.target.value)}>
          <option value="">Të gjitha nivelet</option><option value="critical">Kritik</option><option value="warning">Paralajmërim</option><option value="info">Informues</option>
        </select></label>
        <label>Statusi<select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)}>
          <option value="">Të gjitha statuset</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Kërko<div className="alerts-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Titull, përshkrim, kategori…" /><button type="submit" aria-label="Kërko alarmet"><Search size={17} /></button></div></label>
      </form>

      {error && <p className="alerts-error" role="alert">{error}</p>}
      {laboratoryId && (scenariosLoading || scenariosError || scenarios.length > 0) && <section className="alerts-scenarios" aria-label="Skenarët e ekzekutuar">
        <div className="alerts-section-heading"><h2>Skenarët e ekzekutuar</h2><span>{scenarios.length} ekzekutime të ruajtura</span></div>
        <p className="alerts-scenarios-note">Historik nga simulimet e ruajtura. Niveli më poshtë është ai në momentin e ekzekutimit, jo një pohim PASS për testim end-to-end.</p>
        {scenariosLoading ? <LoadingSkeleton /> : scenariosError ? <p className="alerts-error" role="alert">{scenariosError}</p> :
          <div className="alerts-scenario-grid">{scenarios.map((scenario) => <article className="alerts-scenario" key={scenario.id}>
            <div className="alerts-scenario-top"><div><span className="alerts-scenario-run">Run #{scenario.id} · {scenario.laboratoryCode}</span><h3>{scenarioNames[scenario.scenario] ?? scenario.scenario}</h3></div>
              {scenario.alert ? <StatusBadge tone={toneFor[scenario.alert.severityAtExecution]}>{severityLabels[scenario.alert.severityAtExecution] ?? scenario.alert.severityAtExecution}</StatusBadge>
                : <StatusBadge tone={scenario.scenario === "equipment_fault" ? "warning" : "success"}>{scenario.scenario === "equipment_fault" ? "Gjendje problematike" : "Normal"}</StatusBadge>}
            </div>
            <div className="alerts-scenario-values">{scenario.readings.map((reading) => <span key={reading.sensorType}><b>{readingNames[reading.sensorType] ?? reading.sensorType}:</b> {reading.sensorType === "power" ? `${reading.value / 1000} kW` : `${reading.value} ${reading.unit}`}</span>)}</div>
            {scenario.scenario === "equipment_fault" && <p>Pajisja testuese, statusi aktual: <strong>{scenario.equipmentCurrentStatus ?? "i panjohur"}</strong></p>}
            {scenario.alert && <p>Alarm #{scenario.alert.id} · niveli gjatë ekzekutimit: <strong>{severityLabels[scenario.alert.severityAtExecution] ?? scenario.alert.severityAtExecution}</strong>
              {scenario.alert.currentSeverity !== scenario.alert.severityAtExecution && <> · niveli aktual: <strong>{severityLabels[scenario.alert.currentSeverity] ?? scenario.alert.currentSeverity}</strong></>}</p>}
            <time dateTime={scenario.startedAt}>{formatDate(scenario.startedAt)}</time>
          </article>)}</div>}
      </section>}
      <div className="alerts-layout">
        <section className="alerts-list" aria-label="Lista e alarmeve">
          <div className="alerts-section-heading"><h2>Regjistri i alarmeve</h2><span>{pagination?.total ?? alerts.length} gjithsej</span></div>
          {loading ? <LoadingSkeleton /> : alerts.length === 0 ?
            <EmptyState icon={AlertTriangle} title="Nuk u gjetën alarme" description="Ndrysho filtrat ose kontrollo që laboratori i duhur është zgjedhur." compact /> :
            alerts.map((alert) => <button type="button" key={alert.id}
              className={`alerts-row${String(selectedId) === String(alert.id) ? " is-selected" : ""}`}
              onClick={() => setSelectedId(alert.id)}>
              <span className="alerts-row-top"><strong>#{alert.id} · {alert.title}</strong><StatusBadge tone={toneFor[alert.severity]}>{severityLabels[alert.severity] ?? alert.severity}</StatusBadge></span>
              <span className="alerts-row-description">{alert.description}</span>
              <span className="alerts-row-meta">{alert.laboratoryName} · {statusLabels[alert.status] ?? alert.status} · {formatDate(alert.createdAt)}</span>
            </button>)}
          {(pagination?.pages ?? 0) > 1 && <div className="alerts-pagination">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Mbrapa</Button>
            <span>Faqja {page} nga {pagination.pages}</span>
            <Button type="button" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Tjetra</Button>
          </div>}
        </section>
        <aside className="alerts-detail" aria-label="Detajet e alarmit">
          {!selectedId ? <p>Zgjidh një alarm për të parë vlerën, burimin dhe historikun.</p> : detailLoading ? <LoadingSkeleton /> : detail ? <>
            <div className="alerts-section-heading"><h2>Alarmi #{detail.id}</h2><StatusBadge tone={toneFor[detail.severity]}>{severityLabels[detail.severity] ?? detail.severity}</StatusBadge></div>
            <h3>{detail.title}</h3><p>{detail.description}</p>
            <dl className="alerts-detail-grid">
              <div><dt>Laboratori</dt><dd>{detail.laboratoryName}</dd></div>
              <div><dt>Sensori</dt><dd>{detail.sensorName ?? "—"}</dd></div>
              <div><dt>Pajisja</dt><dd>{detail.equipmentName ?? "—"}</dd></div>
              <div><dt>Statusi</dt><dd>{statusLabels[detail.status] ?? detail.status}</dd></div>
              <div><dt>Burimi</dt><dd>{detail.source === "simulated" ? "Simulim" : detail.source}</dd></div>
              <div><dt>Krijuar më</dt><dd>{formatDate(detail.createdAt)}</dd></div>
            </dl>
            {detail.history?.length > 0 && <div className="alerts-history"><h3>Historiku i statusit</h3>{detail.history.map((entry) => <p key={entry.id}>{statusLabels[entry.toStatus] ?? entry.toStatus} · {formatDate(entry.createdAt)}{entry.notes ? ` — ${entry.notes}` : ""}</p>)}</div>}
          </> : <p>Detajet nuk janë të disponueshme.</p>}
        </aside>
      </div>
    </div>
  );
}
