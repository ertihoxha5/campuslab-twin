import { useState } from "react";
import { Activity, Boxes, ChevronLeft, Cpu, Radio } from "lucide-react";
import { MonitoringIndicators } from "@/components/MonitoringIndicators.jsx";

const number = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "—";
const time = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat("sq-AL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "—";

export function TwinOverviewDashboard({ laboratory, zones, assets, sensors, events = [], alerts = [], onClose, onSelect }) {
  const [tab, setTab] = useState("overview");
  const energy = assets.reduce((sum, asset) => sum + Number(asset.energyWatts || 0), 0);
  const activeAlerts = alerts.filter((alert) => !["resolved", "closed"].includes(alert.status));
  const latestUpdate = [...sensors, ...assets].map((item) => item.lastUpdate).filter(Boolean).sort().at(-1);

  return <aside className="twin-lab-dashboard twin-overview-dashboard" aria-label="Dashboard i laboratorit">
    <header><div><span><Radio size={12}/> TË DHËNA LIVE / SIMULIM</span><h2>{laboratory?.name ?? "Laboratori"}</h2><p>{laboratory?.code ?? ""} · Përditësuar {time(latestUpdate)}</p></div><button type="button" onClick={onClose} aria-label="Mbyll dashboard-in"><ChevronLeft size={18}/></button></header>
    <MonitoringIndicators compact laboratory={laboratory} sensors={sensors} powerWatts={assets.length ? energy : null} equipment={assets}/>
    <p className="twin-dashboard-alert-count">{activeAlerts.length} alarme aktive</p>
    <nav className="twin-dashboard-tabs" aria-label="Seksionet e dashboard-it">
      {[["overview", "Zonat"], ["devices", "Pajisjet"], ["sensors", "Sensorët"], ["activity", "Aktiviteti"]].map(([id, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <div className="twin-dashboard-content">
      {tab === "overview" && <section><div className="twin-dashboard-section-title"><div><Boxes size={15}/><strong>Zonat e këtij laboratori</strong></div><span>{zones.length}</span></div><div className="twin-dashboard-zone-list">{zones.map((zone) => {
        const zoneAssets = assets.filter((asset) => asset.zoneId === zone.id);
        const zoneSensors = sensors.filter((sensor) => sensor.zoneId === zone.id);
        const warning = zoneAssets.some((asset) => asset.status === "alarm") || zoneSensors.some((sensor) => sensor.state === "alarm");
        return <button type="button" key={zone.id} onClick={() => onSelect({ kind: "zone", item: zone })}><i style={{ background: warning ? "#e36c60" : zone.color }}/><div><strong>{zone.name}</strong><small>{zone.code} · {zoneAssets.length} pajisje · {zoneSensors.length} sensorë</small></div><span>{warning ? "Alarm" : "Në rregull"}</span></button>;
      })}</div>{!zones.length && <p className="twin-dashboard-empty">Ky laborator nuk ka ende zona të konfiguruara.</p>}</section>}
      {tab === "devices" && <section><div className="twin-dashboard-section-title"><div><Cpu size={15}/><strong>Pajisjet e laboratorit</strong></div><span>{assets.length}</span></div><div className="twin-dashboard-list">{assets.map((asset) => <button type="button" key={asset.id} onClick={() => onSelect({ kind: "asset", item: asset })}><i className={`asset-state state-${asset.status}`}/><div><strong>{asset.name}</strong><small>{asset.code} · {asset.zoneName}</small></div><em>{number(asset.energyWatts, 0)} W</em></button>)}</div>{!assets.length && <p className="twin-dashboard-empty">Nuk ka pajisje të regjistruara.</p>}</section>}
      {tab === "sensors" && <section><div className="twin-dashboard-section-title"><div><Radio size={15}/><strong>Sensorët e lidhur</strong></div><span>{sensors.length}</span></div><div className="twin-dashboard-list">{sensors.map((sensor) => <button type="button" key={sensor.id} onClick={() => onSelect({ kind: "sensor", item: sensor })}><i className={`asset-state state-${sensor.state === "alarm" ? "alarm" : sensor.state === "offline" ? "offline" : sensor.state === "warning" ? "maintenance" : "operational"}`}/><div><strong>{sensor.name}</strong><small>{sensor.zoneName} · {time(sensor.lastUpdate)}</small></div><em>{sensor.state === "offline" ? "Offline" : `${number(sensor.value)} ${sensor.unit ?? ""}`}</em></button>)}</div>{!sensors.length && <p className="twin-dashboard-empty">Nuk ka sensorë të lidhur.</p>}</section>}
      {tab === "activity" && <section><div className="twin-dashboard-section-title"><div><Activity size={15}/><strong>Ngjarjet e fundit</strong></div><span>{events.length}</span></div><div className="twin-dashboard-events">{events.slice(0, 20).map((event) => <article key={event.id}><time>{time(event.createdAt)}</time><div><strong>{event.description || event.eventType}</strong><small>{event.zoneName ?? "Laboratori"}</small></div></article>)}</div>{!events.length && <p className="twin-dashboard-empty">Nuk ka ende ngjarje të regjistruara.</p>}</section>}
    </div>
  </aside>;
}
