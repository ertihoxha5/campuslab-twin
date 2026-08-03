import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CircleAlert, Radio, RefreshCw, Zap } from "lucide-react";
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
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { Button } from "@/components/ui/button.jsx";

const colors = ["#58427c", "#6c7653", "#111827", "#9c6b30", "#346c73"];
const statusLabels = {
  new: "I ri",
  acknowledged: "I pranuar",
  in_progress: "Në trajtim",
  resolved: "I zgjidhur",
  closed: "I mbyllur",
};

const timeLabel = (value) =>
  new Intl.DateTimeFormat("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

export function RealtimeMonitoringPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [readings, setReadings] = useState({});
  const [chartData, setChartData] = useState([]);
  const [energy, setEnergy] = useState(null);
  const [connection, setConnection] = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const laboratoryResponse = await api.get(
        "/api/laboratories?page=1&pageSize=100&status=active",
      );
      const options = laboratoryResponse.data.laboratories ?? [];
      setLaboratories(options);
      setLaboratoryId((current) => current || String(options[0]?.id ?? ""));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    if (!laboratoryId) {
      setAlerts([]);
      setReadings({});
      setEnergy(null);
      return;
    }
    try {
      const [alertResponse, dashboardResponse] = await Promise.all([
        api.get(`/api/alerts?laboratoryId=${laboratoryId}&page=1&pageSize=8`),
        api.get(`/api/dashboard/summary?laboratoryId=${laboratoryId}&hours=24`),
      ]);
      setAlerts(
        (alertResponse.data.alerts ?? []).filter(
          (alert) => !["resolved", "closed"].includes(alert.status),
        ),
      );
      const snapshot = dashboardResponse.data.summary;
      const snapshotReadings = Object.fromEntries(
        (snapshot.latestSensorReadings ?? []).map((reading) => [
          reading.sensorId,
          reading,
        ]),
      );
      setReadings((current) => {
        const restored = { ...snapshotReadings };
        for (const [sensorId, reading] of Object.entries(current)) {
          if (
            !restored[sensorId] ||
            new Date(reading.recordedAt) >= new Date(restored[sensorId].recordedAt)
          ) {
            restored[sensorId] = reading;
          }
        }
        return restored;
      });
      setEnergy(
        snapshot.metrics?.currentPowerWatts > 0
          ? {
              powerWatts: snapshot.metrics.currentPowerWatts,
              source: snapshot.containsSimulatedData ? "simulated" : "recorded",
            }
          : null,
      );
      const latestRecordedAt = (snapshot.latestSensorReadings ?? [])
        .map((reading) => reading.recordedAt)
        .filter(Boolean)
        .sort()
        .at(-1);
      setLastUpdate((current) =>
        current && latestRecordedAt && new Date(current) > new Date(latestRecordedAt)
          ? current
          : (latestRecordedAt ?? current ?? null),
      );
    } catch (error) {
      setMessage(error.message);
    }
  }, [laboratoryId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    setReadings({});
    setChartData([]);
    setEnergy(null);
    setLastUpdate(null);
    setConnection("connecting");
    loadSnapshot();
    if (!laboratoryId) return undefined;

    return connectMonitoringRealtime({
      laboratoryId,
      onConnectionChange(status) {
        setConnection(status);
        if (status === "connected") loadSnapshot();
      },
      onEvent(eventName, payload) {
        if (eventName === "sensor:reading") {
          setReadings((current) => ({
            ...current,
            [payload.sensorId]: payload,
          }));
          setChartData((current) => [
            ...current.slice(-39),
            {
              recordedAt: payload.recordedAt,
              time: timeLabel(payload.recordedAt),
              [`sensor_${payload.sensorId}`]: Number(payload.value),
            },
          ]);
          setLastUpdate(payload.recordedAt);
        } else if (eventName === "energy:reading") {
          setEnergy(payload);
          setLastUpdate(payload.recordedAt);
        } else if (["alert:created", "alert:updated"].includes(eventName)) {
          loadSnapshot();
        }
      },
    });
  }, [laboratoryId, loadSnapshot]);

  const latestReadings = useMemo(() => Object.values(readings), [readings]);
  const chartSensors = useMemo(
    () => latestReadings.slice(0, colors.length),
    [latestReadings],
  );

  return (
    <section className="workspace-overview realtime-monitoring-page">
      <div className="dashboard-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Operacionet live</p>
          <h1>Monitorimi në kohë reale</h1>
          <p>Leximet dhe alarmet e laboratorit të zgjedhur, pa të dhëna të sajuara.</p>
        </div>
        <Button type="button" variant="outline" onClick={loadSnapshot} disabled={!laboratoryId}>
          <RefreshCw size={16} /> Rifresko gjendjen
        </Button>
      </div>

      <div className="realtime-toolbar">
        <label>
          <span>Laboratori</span>
          <select value={laboratoryId} onChange={(event) => setLaboratoryId(event.target.value)}>
            {laboratories.length === 0 && <option value="">Nuk ka laborator aktiv</option>}
            {laboratories.map((laboratory) => (
              <option key={laboratory.id} value={laboratory.id}>
                {laboratory.name} ({laboratory.code})
              </option>
            ))}
          </select>
        </label>
        <span className={`realtime-status ${connection}`} role="status">
          <i aria-hidden="true" />
          {connection === "connected"
            ? "Lidhur drejtpërdrejt"
            : connection === "connecting"
              ? "Po lidhet"
              : "Lidhja u ndërpre"}
        </span>
        <span className="realtime-last-update">
          {lastUpdate ? `Leximi i fundit: ${timeLabel(lastUpdate)}` : "Në pritje të leximit të parë"}
        </span>
      </div>

      {message && <div className="dashboard-error" role="alert"><strong>Të dhënat nuk mund të ngarkohen</strong><p>{message}</p></div>}

      <div className="realtime-summary-grid">
        <article><Activity size={20} /><span>Sensorë live</span><strong>{latestReadings.length}</strong></article>
        <article><Zap size={20} /><span>Fuqia e fundit</span><strong>{energy ? `${Number(energy.powerWatts).toLocaleString("sq-AL")} W` : "—"}</strong></article>
        <article><CircleAlert size={20} /><span>Alarme aktive</span><strong>{alerts.length}</strong></article>
        <article><Radio size={20} /><span>Burimi</span><strong>{latestReadings.length ? (latestReadings.some((reading) => reading.source === "simulated") ? "Simulim" : "Regjistruar") : "—"}</strong></article>
      </div>

      <div className="realtime-content-grid">
        <article className="realtime-panel realtime-chart-panel">
          <div><h2>Trend i leximeve live</h2><p>Ruhet vetëm gjatë këtij sesioni.</p></div>
          {chartData.length === 0 ? (
            <div className="realtime-empty"><Activity size={24} /><p>Në pritje të leximeve realtime nga simulatori.</p></div>
          ) : (
            <div className="realtime-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" /><YAxis /><Tooltip />
                  {chartSensors.map((reading, index) => (
                    <Line key={reading.sensorId} type="monotone" dataKey={`sensor_${reading.sensorId}`} name={`${reading.sensorType} (${reading.unit})`} stroke={colors[index]} strokeWidth={2} connectNulls dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="realtime-panel">
          <div><h2>Alarmet aktive</h2><p>Renditur sipas rëndësisë.</p></div>
          {loading ? <p>Po ngarkohen…</p> : alerts.length === 0 ? (
            <div className="realtime-empty"><CircleAlert size={24} /><p>Nuk ka alarme aktive për këtë laborator.</p></div>
          ) : (
            <div className="realtime-alert-list">
              {alerts.map((alert) => (
                <div key={alert.id} className={`realtime-alert ${alert.severity}`}>
                  <strong>{alert.title}</strong>
                  <span>{statusLabels[alert.status] ?? alert.status}</span>
                  <p>{alert.description}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="realtime-sensor-grid">
        {latestReadings.map((reading) => (
          <article key={reading.sensorId}>
            <span>{reading.sensorType}</span>
            <strong>{Number(reading.value).toLocaleString("sq-AL")} {reading.unit}</strong>
            <small>{reading.source === "simulated" ? "Simuluar" : "Regjistruar"} · {timeLabel(reading.recordedAt)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
