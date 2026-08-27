import { ChevronRight, X } from "lucide-react";
import { TWIN_ZONES } from "./twin-config.js";

function MiniChart({ history=[] }) {
  const values=history.map((point)=>Number(point.value));
  const min=Math.min(...values,0);const max=Math.max(...values,1);const range=Math.max(1,max-min);
  const points=values.map((value,index)=>`${(index/Math.max(1,values.length-1))*100},${38-((value-min)/range)*32}`).join(" ");
  return <svg className="twin-mini-chart" viewBox="0 0 100 42" preserveAspectRatio="none" aria-label="Historia e vlerave"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

export function TwinSelectionPanel({ selection,history,onClose,onFocus }) {
  if(!selection)return null;
  const item=selection.item;const zone=TWIN_ZONES.find((candidate)=>candidate.id===item.zoneId);
  const isSensor=selection.kind==="sensor",isPlacement=selection.kind==="placement";
  return <aside className="twin-selection-panel" aria-label="Detajet e objektit të zgjedhur">
    <div className="twin-panel-head"><div><span>{isSensor?"Sensor IoT":"Asset fizik"}</span><h2>{item.name}</h2></div><button type="button" onClick={onClose} aria-label="Mbyll panelin"><X size={18}/></button></div>
    <div className={`twin-object-state state-${item.state??item.status}`}><i/><strong>{item.state??item.status}</strong><span>Përditësuar {new Intl.DateTimeFormat("sq-AL",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(item.lastUpdate))}</span></div>
    <dl className="twin-object-details">
      <div><dt>ID</dt><dd>{item.id}</dd></div><div><dt>Zona</dt><dd>{zone?.name??item.zoneId}</dd></div><div><dt>Tipi</dt><dd>{item.type}</dd></div>
      {isSensor?<><div><dt>Matja</dt><dd>{item.value} {item.unit}</dd></div><div><dt>Statusi</dt><dd>{item.state}</dd></div><div><dt>Asset-i</dt><dd>{item.assetId??"Ambient"}</dd></div></>:isPlacement?<><div><dt>Pajisja</dt><dd>{item.parentEquipmentId??"Pa lidhje"}</dd></div><div><dt>Modeli</dt><dd>{item.visualAssetName??item.builtInKey??"Standard"}</dd></div><div><dt>Shkalla</dt><dd>{Number(item.scale?.x??1).toFixed(2)}×</dd></div></>:<><div><dt>Temperatura</dt><dd>{Number(item.temperature??0).toFixed(1)} °C</dd></div><div><dt>Energjia</dt><dd>{Number(item.energyWatts??0).toFixed(0)} W</dd></div><div><dt>Mirëmbajtja</dt><dd>{item.maintenance}</dd></div></>}
    </dl>
    <section className="twin-history-card"><div><strong>Historia live</strong><span>18 matjet e fundit</span></div><MiniChart history={history}/></section>
    <button type="button" className="twin-focus-action" onClick={onFocus}>Fokuso në objekt <ChevronRight size={16}/></button>
  </aside>;
}
