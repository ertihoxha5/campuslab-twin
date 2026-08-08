import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CirclePause,
  CirclePlay,
  Eye,
  FlaskConical,
  History,
  RefreshCw,
  RotateCcw,
  Square,
  Thermometer,
  Wind,
  Zap,
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

const scenarioLabels = {
  temperature_rise: "Rritje e temperaturës",
  ventilation_failure: "Dështim i ventilimit",
  equipment_failure: "Dështim i pajisjes",
  sensor_offline: "Sensor jashtë linje",
  overcapacity: "Kapacitet i tejkaluar",
  smoke_incident: "Incident tymi",
  power_spike: "Rritje e fuqisë",
  energy_saving: "Kursim i energjisë",
};
const statusLabels = {
  queued: "Në pritje",
  running: "Duke u ekzekutuar",
  paused: "I pezulluar",
  completed: "I përfunduar",
  stopped: "I ndalur",
  failed: "Dështoi",
};
const eventLabels = {
  started: "Simulimi u nis",
  paused: "Simulimi u pezullua",
  resumed: "Simulimi rifilloi",
  reading_generated: "U gjeneruan lexime",
  alert_generated: "U krijua alarm",
  stopped: "Simulimi u ndal",
  reset: "U rikthye baseline-i",
  failed: "Simulimi dështoi",
};
const initialOverrides = {
  intensity: "1",
  startTick: "3",
  durationTicks: "8",
  previewTicks: "12",
  baselineOccupancy: "",
  equipmentLoad: "",
};
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("sq-AL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const number = (value, digits = 1) =>
  new Intl.NumberFormat("sq-AL", { maximumFractionDigits: digits }).format(
    Number(value ?? 0),
  );

export function SimulationsPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("");
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runDetail, setRunDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [samplingIntervalSeconds, setSamplingIntervalSeconds] = useState("60");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    api
      .get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => {
        const items = response.data.laboratories ?? [];
        setLaboratories(items);
        setLaboratoryId(String(items[0]?.id ?? ""));
      })
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!laboratoryId) return;
    setLoading(true);
    try {
      const [scenarioResponse, statusResponse, historyResponse] =
        await Promise.all([
          api.get(`/api/simulator/laboratories/${laboratoryId}/scenarios`),
          api.get(`/api/simulator/laboratories/${laboratoryId}/status`),
          api.get(
            `/api/simulator/laboratories/${laboratoryId}/runs?page=1&pageSize=20`,
          ),
        ]);
      const available = scenarioResponse.data.scenarios ?? [];
      setScenarios(available);
      setScenarioId((current) =>
        available.some((item) => String(item.id) === current)
          ? current
          : String(available[0]?.id ?? ""),
      );
      setRun(statusResponse.data.run ?? null);
      setRuns(historyResponse.data.runs ?? []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [laboratoryId]);

  useEffect(() => {
    setPreview(null);
    setRunDetail(null);
    void loadWorkspace();
  }, [loadWorkspace]);
  const payloadOverrides = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(overrides)
          .filter(([, value]) => value !== "")
          .map(([key, value]) => [key, Number(value)]),
      ),
    [overrides],
  );

  async function previewScenario() {
    if (!scenarioId) return;
    setWorking("preview");
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post(
        `/api/simulator/laboratories/${laboratoryId}/preview`,
        { scenarioId, overrides: payloadOverrides },
      );
      setPreview(response.data.preview);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking("");
    }
  }
  async function startScenario() {
    setWorking("start");
    try {
      const response = await api.post(
        `/api/simulator/laboratories/${laboratoryId}/start`,
        { scenarioId, samplingIntervalSeconds, overrides: payloadOverrides },
      );
      setMessage({ type: "success", text: response.data.message });
      await loadWorkspace();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking("");
    }
  }
  async function control(action) {
    setWorking(action);
    try {
      const response = await api.post(
        `/api/simulator/laboratories/${laboratoryId}/${action}`,
      );
      setMessage({ type: "success", text: response.data.message });
      await loadWorkspace();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking("");
    }
  }
  async function openRun(runId) {
    setWorking(`detail-${runId}`);
    try {
      const response = await api.get(
        `/api/simulator/laboratories/${laboratoryId}/runs/${runId}`,
      );
      setRunDetail(response.data.run);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking("");
    }
  }
  const active = ["queued", "running", "paused"].includes(run?.status);

  return (
    <section className="simulations-page">
      <div className="laboratories-heading">
        <div className="workspace-page-heading">
          <p className="eyebrow">Eksperimente të kontrolluara</p>
          <h1>Simulimet</h1>
          <p>
            Parashikoni ndikimin, ekzekutoni skenarin dhe ruani evidencën pa
            ndryshuar baseline-in.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadWorkspace}
          disabled={loading || !laboratoryId}
        >
          <RefreshCw size={16} /> Rifresko
        </Button>
      </div>
      <div className="simulation-lab-picker">
        <label>
          <span>Laboratori</span>
          <select
            value={laboratoryId}
            onChange={(event) => setLaboratoryId(event.target.value)}
          >
            {laboratories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {run && (
          <div className={`simulation-status ${run.status}`}>
            <span>Status i fundit</span>
            <strong>{statusLabels[run.status] ?? run.status}</strong>
            <small>{run.scenarioName ?? "Pa skenar"}</small>
          </div>
        )}
      </div>
      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}
      {loading && !scenarios.length ? (
        <div className="maintenance-loading">
          Po ngarkohet hapësira e simulimit…
        </div>
      ) : !laboratoryId ? (
        <Empty
          title="Nuk ka laborator aktiv"
          text="Krijoni një laborator para se të përdorni simulimet."
        />
      ) : !scenarios.length ? (
        <Empty
          title="Nuk ka skenarë aktivë"
          text="Ky laborator nuk ka ende skenarë të konfiguruar në server."
        />
      ) : (
        <>
          <div className="simulation-workspace-grid">
            <article className="simulation-panel simulation-config">
              <PanelHeader
                number="01"
                title="Konfigurimi"
                text="Zgjidhni skenarin dhe parametrat brenda kufijve të sigurt."
              />
              <div className="simulation-scenario-list">
                {scenarios.map((scenario) => (
                  <button
                    type="button"
                    key={scenario.id}
                    className={
                      String(scenario.id) === scenarioId ? "is-selected" : ""
                    }
                    onClick={() => {
                      setScenarioId(String(scenario.id));
                      setPreview(null);
                    }}
                  >
                    <FlaskConical size={17} />
                    <span>
                      <strong>{scenario.name}</strong>
                      <small>
                        {scenarioLabels[scenario.scenarioType] ??
                          scenario.scenarioType}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="simulation-fields">
                <NumericField
                  label="Intensiteti"
                  min="0.1"
                  max="3"
                  step="0.1"
                  name="intensity"
                  value={overrides.intensity}
                  onChange={setOverrides}
                  state={overrides}
                />
                <NumericField
                  label="Fillon në tick"
                  min="1"
                  max="1000"
                  name="startTick"
                  value={overrides.startTick}
                  onChange={setOverrides}
                  state={overrides}
                />
                <NumericField
                  label="Kohëzgjatja"
                  min="1"
                  max="1000"
                  name="durationTicks"
                  value={overrides.durationTicks}
                  onChange={setOverrides}
                  state={overrides}
                />
                <NumericField
                  label="Ticks në preview"
                  min="1"
                  max="60"
                  name="previewTicks"
                  value={overrides.previewTicks}
                  onChange={setOverrides}
                  state={overrides}
                />
                <NumericField
                  label="Occupancy bazë"
                  min="0"
                  max="500"
                  name="baselineOccupancy"
                  value={overrides.baselineOccupancy}
                  onChange={setOverrides}
                  state={overrides}
                  placeholder="Nga skenari"
                />
                <NumericField
                  label="Ngarkesa e pajisjeve"
                  min="0"
                  max="1"
                  step="0.05"
                  name="equipmentLoad"
                  value={overrides.equipmentLoad}
                  onChange={setOverrides}
                  state={overrides}
                  placeholder="Nga skenari"
                />
                <label>
                  <span>Intervali i run-it</span>
                  <select
                    aria-label="Intervali i run-it"
                    value={samplingIntervalSeconds}
                    onChange={(event) =>
                      setSamplingIntervalSeconds(event.target.value)
                    }
                  >
                    <option value="5">5 sekonda</option>
                    <option value="30">30 sekonda</option>
                    <option value="60">1 minutë</option>
                    <option value="300">5 minuta</option>
                  </select>
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={previewScenario}
                disabled={working === "preview"}
              >
                <Eye size={16} />{" "}
                {working === "preview" ? "Po përgatitet…" : "Shiko preview"}
              </Button>
            </article>
            <article className="simulation-panel simulation-preview">
              <PanelHeader
                number="02"
                title="Preview determinist"
                text="Preview nuk ruan lexime dhe nuk prek laboratorin."
              />
              {preview ? (
                <>
                  <div className="simulation-preview-metrics">
                    <Metric
                      icon={Thermometer}
                      label="Temperatura finale"
                      value={`${number(preview.timeline.at(-1)?.values.temperature)} °C`}
                    />
                    <Metric
                      icon={Wind}
                      label="CO₂ final"
                      value={`${number(preview.timeline.at(-1)?.values.co2, 0)} ppm`}
                    />
                    <Metric
                      icon={Zap}
                      label="Fuqia finale"
                      value={`${number(preview.timeline.at(-1)?.values.power / 1000)} kW`}
                    />
                  </div>
                  <div className="simulation-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={preview.timeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="tick"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="environment"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis yAxisId="power" orientation="right" hide />
                        <Tooltip />
                        <Line
                          yAxisId="environment"
                          type="monotone"
                          dataKey="values.temperature"
                          name="Temperatura °C"
                          stroke="#58427c"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="environment"
                          type="monotone"
                          dataKey="values.co2"
                          name="CO₂ ppm"
                          stroke="#6c7b5b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="power"
                          type="monotone"
                          dataKey="values.power"
                          name="Fuqia W"
                          stroke="#17151a"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="simulation-source-note">
                    Burimi: motor determinist · Nuk u ruajt në databazë
                  </p>
                </>
              ) : (
                <Placeholder
                  icon={Eye}
                  title="Preview ende nuk është gjeneruar"
                  text="Rishikoni konfigurimin dhe zgjidhni “Shiko preview”."
                />
              )}
            </article>
          </div>
          <article className="simulation-panel simulation-controls">
            <PanelHeader
              number="03"
              title="Kontrollet e ekzekutimit"
              text="Vetëm një run aktiv lejohet për laborator."
            />
            <div className="simulation-control-buttons">
              <Button
                onClick={startScenario}
                disabled={active || !scenarioId || Boolean(working)}
              >
                <CirclePlay size={17} /> Nis skenarin
              </Button>
              <Button
                variant="outline"
                onClick={() => control("pause")}
                disabled={run?.status !== "running" || Boolean(working)}
              >
                <CirclePause size={17} /> Pezullo
              </Button>
              <Button
                variant="outline"
                onClick={() => control("resume")}
                disabled={run?.status !== "paused" || Boolean(working)}
              >
                <CirclePlay size={17} /> Rifillo
              </Button>
              <Button
                variant="outline"
                onClick={() => control("stop")}
                disabled={!active || Boolean(working)}
              >
                <Square size={16} /> Ndal
              </Button>
              <Button
                variant="outline"
                onClick={() => control("reset")}
                disabled={!run || Boolean(working)}
              >
                <RotateCcw size={16} /> Rikthe baseline-in
              </Button>
            </div>
          </article>
          <div className="simulation-history-grid">
            <article className="simulation-panel">
              <PanelHeader
                icon={History}
                title="Historiku"
                text="Run-et e fundit të këtij laboratori."
              />
              {runs.length ? (
                <div className="simulation-runs">
                  {runs.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={
                        String(runDetail?.id) === String(item.id)
                          ? "is-selected"
                          : ""
                      }
                      onClick={() => openRun(item.id)}
                    >
                      <span>
                        <strong>{item.scenarioName}</strong>
                        <small>{formatDate(item.startedAt)}</small>
                      </span>
                      <span>
                        <i className={`run-status ${item.status}`}>
                          {statusLabels[item.status] ?? item.status}
                        </i>
                        <small>{number(item.readingCount, 0)} lexime</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="energy-empty">Nuk ka ende ekzekutime.</p>
              )}
            </article>
            <article className="simulation-panel">
              <PanelHeader
                icon={History}
                title="Timeline i run-it"
                text="Ngjarje immutable sipas rendit të ruajtur."
              />
              {runDetail ? (
                <>
                  <div className="simulation-run-summary">
                    <div>
                      <span>Skenari</span>
                      <strong>{runDetail.scenarioName}</strong>
                    </div>
                    <div>
                      <span>Autori</span>
                      <strong>{runDetail.startedByUserName ?? "—"}</strong>
                    </div>
                    <div>
                      <span>Fillimi</span>
                      <strong>{formatDate(runDetail.startedAt)}</strong>
                    </div>
                  </div>
                  <ol className="simulation-timeline">
                    {runDetail.timeline.map((event) => (
                      <li key={event.id}>
                        <span>{event.sequenceNumber}</span>
                        <div>
                          <strong>
                            {eventLabels[event.eventType] ?? event.eventType}
                          </strong>
                          <small>{formatDate(event.occurredAt)}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <Placeholder
                  icon={History}
                  text="Zgjidhni një run për të parë timeline-in."
                />
              )}
            </article>
          </div>
        </>
      )}
    </section>
  );
}

function PanelHeader({ number: step, icon: Icon, title, text }) {
  return (
    <header>
      <div>
        {step ? <span>{step}</span> : <Icon size={18} />}
        <h2>{title}</h2>
      </div>
      <p>{text}</p>
    </header>
  );
}
function NumericField({ label, name, value, state, onChange, ...props }) {
  return (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={value}
        onChange={(event) => onChange({ ...state, [name]: event.target.value })}
        {...props}
      />
    </label>
  );
}
function Metric({ icon: Icon, label, value }) {
  return (
    <div>
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Placeholder({ icon: Icon, title, text }) {
  return (
    <div className="simulation-preview-placeholder">
      <Icon size={26} />
      {title && <h3>{title}</h3>}
      <p>{text}</p>
    </div>
  );
}
function Empty({ title, text }) {
  return (
    <div className="simulation-empty">
      <FlaskConical size={28} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
