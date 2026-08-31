import { Activity, Boxes, ChevronLeft, Cpu, Gauge, Thermometer, Users, Zap } from "lucide-react";

export function TwinLaboratoryDashboard({ laboratory, zones, assets, sensors, onClose, onSelect }) {
  const occupancy = sensors.find((sensor) => sensor.type === "occupancy")?.value ?? 0;
  const temperature = sensors.find((sensor) => sensor.type === "temperature")?.value ?? 0;
  const energy = assets.reduce((sum, asset) => sum + Number(asset.energyWatts ?? 0), 0);
  return <aside className="twin-lab-dashboard" aria-label="Dashboard i laboratorit">
    <header><div><span>Digital Twin dinamik</span><h2>{laboratory?.name ?? "Laboratori"}</h2><p>{laboratory?.code ?? ""}</p></div><button type="button" onClick={onClose} aria-label="Mbyll dashboard-in"><ChevronLeft size={18}/></button></header>
    <div className="twin-dashboard-kpis">
      <Metric icon={Thermometer} value={`${Number(temperature).toFixed(1)}°`} label="Temperatura"/>
      <Metric icon={Users} value={occupancy} label="Persona"/>
      <Metric icon={Zap} value={`${(energy / 1000).toFixed(2)} kW`} label="Konsumi"/>
      <Metric icon={Activity} value={sensors.length} label="Sensorë"/>
    </div>
    <section><div className="twin-dashboard-section-title"><div><Boxes size={15}/><strong>Zonat reale</strong></div><span>{zones.length}</span></div><div className="twin-dashboard-zone-list">{zones.map((zone) => { const count = assets.filter((asset) => asset.zoneId === zone.id).length; return <article key={zone.id}><i style={{ background: zone.color }}/><div><strong>{zone.name}</strong><small>{zone.code} · {count} pajisje</small></div></article>; })}</div></section>
    <section className="twin-dashboard-assets"><div className="twin-dashboard-section-title"><div><Cpu size={15}/><strong>Pajisjet e laboratorit</strong></div><span>{assets.length}</span></div><div>{assets.map((asset) => <button type="button" key={asset.id} onClick={() => onSelect({ kind: "asset", item: asset })}><span className={`asset-state state-${asset.status}`}/><div><strong>{asset.name}</strong><small>{asset.code} · {asset.zoneName}</small></div><Gauge size={14}/></button>)}</div></section>
  </aside>;
}

function Metric({ icon: Icon, value, label }) {
  return <article><Icon size={16}/><div><strong>{value}</strong><span>{label}</span></div></article>;
}
