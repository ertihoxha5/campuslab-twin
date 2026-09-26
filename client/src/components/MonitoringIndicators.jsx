import { Activity, Droplets, Thermometer, Users, Zap } from "lucide-react";
import { normalRange, normalState } from "@/utils/monitoring-standards.js";

const indicators = [
  ["temperature", "Temperatura", Thermometer],
  ["humidity", "Lagështia", Droplets],
  ["occupancy", "Prania", Users],
  ["power", "Energjia", Zap],
];

export function MonitoringIndicators({ sensors = [], laboratory, powerWatts, equipment = [], compact = false }) {
  return <div className={compact ? "monitoring-indicators compact" : "monitoring-indicators"} aria-label="Treguesit e laboratorit">
    {indicators.map(([type, label, Icon]) => {
      const sensor = sensors.find((item) => item.type === type || item.sensorType === type);
      const value = type === "power" ? powerWatts : sensor?.value;
      const range = normalRange(type, { sensor, laboratory });
      const state = (sensor?.state === "offline" || sensor?.status === "offline") && type !== "power" ? "unavailable" : normalState(value, range);
      const display = value == null || !Number.isFinite(Number(value)) ? "—" : type === "power" ? `${(Number(value) / 1000).toFixed(2)} kW` : `${Number(value).toLocaleString("sq-AL", { maximumFractionDigits: 1 })} ${range.unit}`;
      const interval = type === "power" ? `${range.min / 1000}–${range.max / 1000} kW` : `${range.min}–${range.max} ${range.unit}`;
      return <article key={type} className={`monitoring-indicator ${state}`}>
        <Icon size={17}/><div><span>{label}</span><strong>{display}</strong><small>{interval} · {state === "unavailable" ? "Pa lexim" : state === "outside" ? "Jashtë intervalit" : "Në interval"}</small></div>
      </article>;
    })}
    <article className="monitoring-indicator"><Activity size={17}/><div><span>Gjendja e pajisjeve</span><strong>{equipment.filter((item) => ["operational", "active"].includes(item.status)).length} aktive / {equipment.filter((item) => !["operational", "active"].includes(item.status)).length} joaktive</strong><small>{equipment.length ? "Sipas statusit aktual" : "Nuk ka pajisje"}</small></div></article>
  </div>;
}
