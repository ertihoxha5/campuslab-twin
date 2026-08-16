import { Activity, BellRing, Droplets, Thermometer, Users, Zap } from "lucide-react";

export function TwinTelemetryHeader({ telemetry }) {
  const items = [
    [Users, telemetry.occupancy, "Persona"],
    [Thermometer, `${telemetry.temperature.toFixed(1)} °C`, "Temperatura"],
    [Droplets, `${telemetry.humidity.toFixed(0)} %`, "Lagështia"],
    [Zap, `${(telemetry.energyWatts / 1000).toFixed(2)} kW`, "Konsumi"],
  ];
  return <header className="twin-status-header">
    <div className="twin-live-state"><Activity size={16}/><strong>LIVE</strong><span>SIMULIM</span></div>
    <div className={`twin-alarm-count ${telemetry.alerts ? "has-alert" : ""}`}><BellRing size={16}/><b>{telemetry.alerts}</b><span>alarme aktive</span></div>
    <div className="twin-kpis">{items.map(([Icon,value,label])=><div key={label}><Icon size={17}/><strong>{value}</strong><span>{label}</span></div>)}</div>
    <time dateTime={telemetry.now.toISOString()}>{new Intl.DateTimeFormat("sq-AL",{timeZone:"Europe/Tirane",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(telemetry.now)}</time>
  </header>;
}
