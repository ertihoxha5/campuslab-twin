import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";

const metricOptions = [
  ["temperature", "Temperatura", "°C", "sensor"],
  ["humidity", "Lagështia", "%", "sensor"],
  ["co2", "CO₂", "ppm", "sensor"],
  ["occupancy", "Occupancy", "persona", "sensor"],
  ["smoke", "Tymi", "%", "sensor"],
  ["power", "Fuqia", "W", "equipment"],
  ["equipment_health", "Shëndeti i pajisjeve", "%", "equipment"],
  ["alerts", "Alarmet", "alarme", "equipment"],
  ["maintenance", "Mirëmbajtja", "detyra", "equipment"],
];
const intervals = {
  hourly: "Për orë",
  daily: "Për ditë",
  weekly: "Për javë",
  monthly: "Për muaj",
};
const sourceLabels = {
  simulated: "Simuluar",
  physical: "Fizik",
  imported: "Importuar",
  alert: "Alarme",
  maintenance: "Mirëmbajtje",
};

function dateInput(date) {
  return date.toISOString().slice(0, 10);
}
function defaultDates() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { startAt: dateInput(start), endAt: dateInput(end) };
}
function toBoundary(value, end = false) {
  return new Date(
    `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`,
  ).toISOString();
}
function number(value, digits = 2) {
  return new Intl.NumberFormat("sq-AL", {
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0));
}
function bucketLabel(value, interval) {
  const date = new Date(
    String(value).replace(" ", "T") +
      (String(value).length <= 10 ? "T00:00:00Z" : "Z"),
  );
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    "sq-AL",
    interval === "hourly"
      ? { day: "2-digit", hour: "2-digit" }
      : { day: "2-digit", month: "short" },
  ).format(date);
}

export function AnalyticsPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [filters, setFilters] = useState({
    metric: "temperature",
    interval: "daily",
    laboratoryId: "",
    assetId: "",
    ...defaultDates(),
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => setLaboratories(response.data.laboratories ?? []))
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!filters.laboratoryId) {
      setSensors([]);
      setEquipment([]);
      return;
    }
    let active = true;
    Promise.all([
      api.get(
        `/api/sensors?laboratoryId=${filters.laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`,
      ),
      api.get(
        `/api/equipment?laboratoryId=${filters.laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`,
      ),
    ])
      .then(([sensorResponse, equipmentResponse]) => {
        if (active) {
          setSensors(sensorResponse.data.sensors ?? []);
          setEquipment(equipmentResponse.data.equipment ?? []);
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [filters.laboratoryId]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const parameters = new URLSearchParams({
        metric: filters.metric,
        interval: filters.interval,
        startAt: toBoundary(filters.startAt),
        endAt: toBoundary(filters.endAt, true),
      });
      if (filters.laboratoryId)
        parameters.set("laboratoryId", filters.laboratoryId);
      if (filters.assetId) parameters.set("assetId", filters.assetId);
      const response = await api.get(`/api/analytics/history?${parameters}`);
      setAnalytics(response.data.analytics);
    } catch (error) {
      setMessage(error.message);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);
  const selectedMetric = metricOptions.find(
    ([value]) => value === filters.metric,
  );
  const assets =
    selectedMetric?.[3] === "sensor"
      ? sensors.filter((item) => item.sensorType === filters.metric)
      : equipment;
  const unit = selectedMetric?.[2] ?? "";
  const metricLabel = selectedMetric?.[1] ?? filters.metric;
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));
  const chartData = useMemo(() => analytics?.series ?? [], [analytics]);

  return (
    <section className="analytics-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Evidencë historike</p>
          <h1>Analitika</h1>
          <p>
            Analizoni readings dhe ngjarjet e ruajtura me filtra të qartë dhe
            burim të gjurmueshëm.
          </p>
        </div>
        <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>
      <div className="analytics-filters">
        <label>
          <span>Metrika</span>
          <select
            aria-label="Metrika"
            value={filters.metric}
            onChange={(event) =>
              update({ metric: event.target.value, assetId: "" })
            }
          >
            {metricOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Laboratori</span>
          <select
            aria-label="Laboratori"
            value={filters.laboratoryId}
            onChange={(event) =>
              update({ laboratoryId: event.target.value, assetId: "" })
            }
          >
            <option value="">I gjithë universiteti</option>
            {laboratories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Asset-i</span>
          <select
            aria-label="Asset-i"
            value={filters.assetId}
            disabled={!filters.laboratoryId || !assets.length}
            onChange={(event) => update({ assetId: event.target.value })}
          >
            <option value="">Të gjitha</option>
            {assets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Grupimi</span>
          <select
            aria-label="Grupimi"
            value={filters.interval}
            onChange={(event) => update({ interval: event.target.value })}
          >
            {Object.entries(intervals).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Nga data</span>
          <input
            aria-label="Nga data"
            type="date"
            value={filters.startAt}
            max={filters.endAt}
            onChange={(event) => update({ startAt: event.target.value })}
          />
        </label>
        <label>
          <span>Deri më</span>
          <input
            aria-label="Deri më"
            type="date"
            value={filters.endAt}
            min={filters.startAt}
            onChange={(event) => update({ endAt: event.target.value })}
          />
        </label>
      </div>
      {message && (
        <p className="form-message error" role="alert">
          {message}
        </p>
      )}
      {loading && !analytics ? (
        <div className="maintenance-loading">
          Po përpunohen të dhënat historike…
        </div>
      ) : (
        analytics && (
          <>
            <div className="analytics-metrics">
              <Summary
                icon={BarChart3}
                label="Mesatarja / totali"
                value={`${number(analytics.summary.value)} ${unit}`}
              />
              <Summary
                icon={Activity}
                label="Minimumi"
                value={
                  analytics.summary.minimum == null
                    ? "—"
                    : `${number(analytics.summary.minimum)} ${unit}`
                }
              />
              <Summary
                icon={Activity}
                label="Maksimumi"
                value={
                  analytics.summary.maximum == null
                    ? "—"
                    : `${number(analytics.summary.maximum)} ${unit}`
                }
              />
              <Summary
                icon={Database}
                label="Mostra"
                value={number(analytics.summary.samples, 0)}
              />
            </div>
            <div className="analytics-grid">
              <article className="analytics-panel analytics-chart-panel">
                <header>
                  <div>
                    <h2>{metricLabel} në kohë</h2>
                    <p>
                      {intervals[filters.interval]} · {filters.startAt} —{" "}
                      {filters.endAt}
                    </p>
                  </div>
                  <CalendarDays size={18} />
                </header>
                {chartData.length ? (
                  <div className="analytics-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="bucketStart"
                          tickFormatter={(value) =>
                            bucketLabel(value, filters.interval)
                          }
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis tickLine={false} axisLine={false} width={60} />
                        <Tooltip
                          labelFormatter={(value) =>
                            bucketLabel(value, filters.interval)
                          }
                          formatter={(value) => [
                            `${number(value)} ${unit}`,
                            metricLabel,
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#58427c"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="analytics-empty">
                    <BarChart3 size={26} />
                    <h3>Nuk ka të dhëna</h3>
                    <p>
                      Nuk u gjetën readings ose ngjarje për filtrat e zgjedhur.
                    </p>
                  </div>
                )}
              </article>
              <article className="analytics-panel">
                <header>
                  <div>
                    <h2>Gjurmueshmëria</h2>
                    <p>Origjina e mostrave të përfshira.</p>
                  </div>
                  <Database size={18} />
                </header>
                {analytics.provenance.length ? (
                  <div className="analytics-provenance">
                    {analytics.provenance.map((item) => (
                      <div key={item.source}>
                        <span>{sourceLabels[item.source] ?? item.source}</span>
                        <strong>{number(item.samples, 0)} mostra</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="analytics-empty-copy">
                    Nuk ka burime për këtë periudhë.
                  </p>
                )}
                <div className="analytics-scope-note">
                  <strong>Kufiri i të dhënave</strong>
                  <p>
                    Rezultati përfshin vetëm laboratorët që ju lejohen nga roli
                    dhe caktimet aktuale.
                  </p>
                </div>
              </article>
            </div>
            <article className="analytics-panel analytics-recommendations-panel">
              <header>
                <div>
                  <h2>Rekomandime të bazuara në rregulla</h2>
                  <p>
                    {analytics.recommendationMethod?.description ??
                      "Rekomandimet krijohen nga pragje të dokumentuara, jo nga parashikime automatike."}
                  </p>
                </div>
                <Lightbulb size={18} />
              </header>
              <div className="analytics-method">
                <span>Metoda</span>
                <strong>
                  Rule-based · versioni{" "}
                  {analytics.recommendationMethod?.version ?? "1.0"}
                </strong>
              </div>
              {(analytics.recommendations ?? []).length ? (
                <div className="analytics-recommendation-list">
                  {analytics.recommendations.map((recommendation) => (
                    <section
                      className={`analytics-recommendation severity-${recommendation.severity}`}
                      key={recommendation.ruleId}
                    >
                      <div className="analytics-rule-heading">
                        <div>
                          <span>Rregulli · {recommendation.ruleId}</span>
                          <h3>{recommendation.title}</h3>
                        </div>
                        <strong>{recommendation.severity}</strong>
                      </div>
                      <p>{recommendation.explanation}</p>
                      <div className="analytics-evidence">
                        <span>Evidenca</span>
                        <strong>
                          {number(recommendation.evidence.observed)}{" "}
                          {recommendation.evidence.unit}{" "}
                          {recommendation.evidence.operator}{" "}
                          {number(recommendation.evidence.threshold)}{" "}
                          {recommendation.evidence.unit}
                        </strong>
                        <small>
                          {number(recommendation.evidence.samples, 0)} mostra të
                          analizuara
                        </small>
                      </div>
                      <div className="analytics-action">
                        <span>Veprimi i rekomanduar</span>
                        <p>{recommendation.action}</p>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="analytics-empty-copy">
                  Asnjë rregull nuk u aktivizua për të dhënat dhe filtrat
                  aktualë.
                </p>
              )}
            </article>
          </>
        )
      )}
    </section>
  );
}

function Summary({ icon: Icon, label, value }) {
  return (
    <article>
      <span>
        <Icon size={18} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
