import { useCallback, useEffect, useState } from "react";
import { Activity, Coins, Gauge, RefreshCw, Save, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const intervalLabels = { hourly: "24 orët", daily: "30 ditët", weekly: "12 javët", monthly: "12 muajt" };
const sourceLabels = { simulated: "Simuluar", physical: "Fizik", imported: "Importuar" };
const storageLabels = { raw: "Lexime raw", aggregate: "Agregate historike" };
const number = (value, maximumFractionDigits = 2) => new Intl.NumberFormat("sq-AL", { maximumFractionDigits }).format(Number(value ?? 0));
const money = (value, currency) => new Intl.NumberFormat("sq-AL", { style: "currency", currency }).format(Number(value ?? 0));

function chartLabel(value, interval) {
  const date = new Date(String(value).replace(" ", "T") + (String(value).length > 10 ? "Z" : "T00:00:00Z"));
  if (Number.isNaN(date.getTime())) return value;
  if (interval === "hourly") return new Intl.DateTimeFormat("sq-AL", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (interval === "monthly") return new Intl.DateTimeFormat("sq-AL", { month: "short" }).format(date);
  return new Intl.DateTimeFormat("sq-AL", { day: "2-digit", month: "short" }).format(date);
}

export function EnergyPage() {
  const user = useAuthStore((state) => state.user);
  const canConfigure = user?.permissions?.includes("university.profile.manage");
  const [overview, setOverview] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [interval, setInterval] = useState("hourly");
  const [laboratoryId, setLaboratoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [tariff, setTariff] = useState({ tariffPerKwh: "0.12", currencyCode: "EUR" });

  const loadOverview = useCallback(async ({ keepMessage = false } = {}) => {
    setLoading(true);
    if (!keepMessage) setMessage({ type: "", text: "" });
    try {
      const parameters = new URLSearchParams({ interval });
      if (laboratoryId) parameters.set("laboratoryId", laboratoryId);
      const response = await api.get(`/api/energy/overview?${parameters}`);
      setOverview(response.data.overview);
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [interval, laboratoryId]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => {
    Promise.all([
      api.get("/api/laboratories?page=1&pageSize=100"),
      api.get("/api/energy/settings"),
    ]).then(([laboratoryResponse, settingsResponse]) => {
      setLaboratories(laboratoryResponse.data.laboratories);
      setTariff({ tariffPerKwh: String(settingsResponse.data.settings.tariffPerKwh), currencyCode: settingsResponse.data.settings.currencyCode });
    }).catch((error) => setMessage({ type: "error", text: error.message }));
  }, []);

  async function saveTariff(event) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await api.put("/api/energy/settings", tariff);
      setMessage({ type: "success", text: response.data.message });
      await loadOverview({ keepMessage: true });
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setSaving(false); }
  }

  const summary = overview?.summary;
  const change = summary?.changePercent;
  const currency = summary?.currencyCode ?? tariff.currencyCode;

  return <section className="energy-page">
    <PageHeader eyebrow="Analitika operative" title="Konsumi i energjisë"
      description="Monitoroni fuqinë, koston dhe burimin e çdo totali të paraqitur."
      actions={<Button variant="outline" size="sm" onClick={() => loadOverview()} disabled={loading}><RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Rifresko</Button>} />
    <div className="energy-toolbar"><label><span>Periudha</span><select value={interval} onChange={(event) => setInterval(event.target.value)}>{Object.entries(intervalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Laboratori</span><select value={laboratoryId} onChange={(event) => setLaboratoryId(event.target.value)}><option value="">I gjithë universiteti</option>{laboratories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    {message.text && <p className={`form-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
    {loading && !overview ? <LoadingSkeleton rows={7} aria-label="Po ngarkohen të dhënat e energjisë" /> : overview && <>
      <div className="energy-metrics">
        <article><span><Zap size={18} /></span><div><p>Fuqia aktuale</p><strong>{number(overview.current.powerWatts / 1000)} kW</strong><small>{overview.current.recordedAt ? "Leximi më i fundit" : "Pa lexim aktual"}</small></div></article>
        <article><span><Activity size={18} /></span><div><p>Energjia totale</p><strong>{number(summary.totalEnergyKwh)} kWh</strong><small>{intervalLabels[interval]}</small></div></article>
        <article><span><Gauge size={18} /></span><div><p>Kulmi</p><strong>{number(summary.peakPowerWatts / 1000)} kW</strong><small>Mesatarja {number(summary.averagePowerWatts / 1000)} kW</small></div></article>
        <article><span><Coins size={18} /></span><div><p>Kosto e vlerësuar</p><strong>{money(summary.estimatedCost, currency)}</strong><small>{number(summary.tariffPerKwh, 4)} {currency}/kWh</small></div></article>
      </div>
      <div className="energy-main-grid">
        <article className="energy-panel energy-chart-panel"><header><div><h2>Trendi i konsumit</h2><p>{intervalLabels[interval]} e fundit</p></div>{change !== null && <span className={change > 0 ? "energy-change up" : "energy-change down"}>{change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{number(Math.abs(change))}%</span>}</header>{overview.trend.length ? <div className="energy-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucketStart" tickFormatter={(value) => chartLabel(value, interval)} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${number(value)} kWh`} tickLine={false} axisLine={false} width={68} /><Tooltip labelFormatter={(value) => chartLabel(value, interval)} formatter={(value) => [`${number(value)} kWh`, "Energjia"]} /><Area type="monotone" dataKey="energyKwh" stroke="#58427c" fill="#eeeaf4" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <p className="energy-empty">Nuk ka lexime për këtë periudhë.</p>}</article>
        <article className="energy-panel"><header><div><h2>Krahasimi</h2><p>Periudha aktuale ndaj paraprakes</p></div></header><div className="energy-comparison"><div><span>Aktuale</span><strong>{number(summary.totalEnergyKwh)} kWh</strong><small>{money(summary.estimatedCost, currency)}</small></div><div><span>Paraprake</span><strong>{number(summary.previousEnergyKwh)} kWh</strong><small>{money(summary.previousEstimatedCost, currency)}</small></div></div></article>
      </div>
      <div className="energy-secondary-grid">
        <article className="energy-panel"><header><div><h2>Konsumatorët kryesorë</h2><p>Pajisjet me konsumin më të lartë</p></div></header>{overview.largestConsumers.length ? <ol className="energy-consumers">{overview.largestConsumers.map((item) => <li key={item.equipmentId}><div><strong>{item.equipmentName}</strong><span>{item.laboratoryName}</span></div><div><strong>{number(item.energyKwh)} kWh</strong><span>{number(item.sharePercent)}%</span></div></li>)}</ol> : <p className="energy-empty">Nuk ka konsum sipas pajisjeve.</p>}</article>
        <article className="energy-panel"><header><div><h2>Rekomandime</h2><p>Veprime të bazuara në të dhënat aktuale</p></div></header><ul className="energy-recommendations">{overview.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="energy-panel"><header><div><h2>Gjurmueshmëria</h2><p>Burimi i totalit energjetik</p></div></header>{overview.provenance.length ? <div className="energy-provenance">{overview.provenance.map((item) => <div key={`${item.source}-${item.storageLevel}`}><span>{sourceLabels[item.source] ?? item.source} · {storageLabels[item.storageLevel] ?? item.storageLevel}</span><strong>{number(item.energyKwh)} kWh</strong><small>{number(item.samples, 0)} mostra</small></div>)}</div> : <p className="energy-empty">Nuk ka të dhëna burimore.</p>}</article>
      </div>
      {canConfigure && <article className="energy-panel energy-settings"><header><div><h2>Tarifa e universitetit</h2><p>Përdoret vetëm për vlerësimin e kostos.</p></div></header><form onSubmit={saveTariff}><label><span>Tarifa për kWh</span><input type="number" min="0" max="1000" step="0.0001" required value={tariff.tariffPerKwh} onChange={(event) => setTariff({ ...tariff, tariffPerKwh: event.target.value })} /></label><label><span>Valuta</span><input minLength={3} maxLength={3} required value={tariff.currencyCode} onChange={(event) => setTariff({ ...tariff, currencyCode: event.target.value.toUpperCase() })} /></label><Button disabled={saving}><Save size={16} /> {saving ? "Po ruhet…" : "Ruaj tarifën"}</Button></form></article>}
    </>}
  </section>;
}
