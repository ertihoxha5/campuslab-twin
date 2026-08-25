import { Check, RotateCcw, X } from "lucide-react";

const TYPES = [["temperature_sensor","Sensor temperature"],["temperature_humidity_sensor","Sensor temperature/lagështi"],["occupancy_sensor","Sensor pranie"],["smoke_detector","Detektor tymi"],["energy_meter","Matës energjie"],["door_sensor","Sensor dere"],["security_camera","Kamerë sigurie"],["emergency_button","Buton emergjence"],["equipment_status_sensor","Sensor pajisjeje"],["computer","Kompjuter"],["server_rack","Server rack"]];
const SURFACES = [["wall","Mur"],["ceiling","Tavan"],["floor","Dysheme"]];

export function AssetPlacementPanel({ placement }) {
  if (!placement.open) return null;
  const field = (key) => (event) => placement.update({ [key]: event.target.value, ...(key === "assetType" ? { name: event.target.options[event.target.selectedIndex].text } : {}) });
  return <aside className="twin-placement-panel" aria-label="Vendos pajisje"><header><div><span>Placement 3D</span><h2>Vendos pajisje</h2></div><button type="button" onClick={placement.cancel} aria-label="Mbyll"><X size={17}/></button></header>
    <label>Lloji i pajisjes<select value={placement.draft.assetType} onChange={field("assetType")}>{TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Emri<input value={placement.draft.name} onChange={field("name")}/></label>
    <label>Asset ID<input value={placement.draft.assetCode} onChange={field("assetCode")}/></label>
    <label>Zona<select value={placement.draft.zoneId} onChange={field("zoneId")}>{placement.zones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
    <label>Sipërfaqja<select value={placement.draft.mountingSurface} onChange={field("mountingSurface")}>{SURFACES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <button className="twin-rotate-placement" type="button" onClick={()=>placement.update({rotation:{...placement.draft.rotation,y:placement.draft.rotation.y+Math.PI/4}})}><RotateCcw size={15}/> Rrotullo 45°</button>
    <p className={placement.validation.valid?"valid":"invalid"}>{placement.validation.reason}</p>{placement.error&&<p className="invalid">{placement.error}</p>}
    <footer><button type="button" onClick={placement.cancel}>Anulo</button><button type="button" disabled={!placement.validation.valid||placement.saving} onClick={placement.confirm}><Check size={15}/>{placement.saving?"Duke ruajtur…":"Konfirmo"}</button></footer>
  </aside>;
}
