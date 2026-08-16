import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box } from "lucide-react";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { DigitalTwinCanvas } from "@/components/digital-twin/DigitalTwinCanvas.jsx";
import { TwinSelectionPanel } from "@/components/digital-twin/TwinSelectionPanel.jsx";
import { TwinTelemetryHeader } from "@/components/digital-twin/TwinTelemetryHeader.jsx";
import { TwinViewerToolbar } from "@/components/digital-twin/TwinViewerToolbar.jsx";
import { useTwinSimulation } from "@/components/digital-twin/useTwinSimulation.js";
import "@/digital-twin.css";

export function DigitalTwinPage() {
  const [laboratories,setLaboratories]=useState([]);
  const [laboratoryId,setLaboratoryId]=useState("");
  const [apiSensors,setApiSensors]=useState([]);
  const [apiEquipment,setApiEquipment]=useState([]);
  const [apiReadings,setApiReadings]=useState({});
  const [apiEnergy,setApiEnergy]=useState({});
  const [alerts,setAlerts]=useState([]);
  const [selectionKey,setSelectionKey]=useState(null);
  const [cameraMode,setCameraMode]=useState("overview");
  const [resetNonce,setResetNonce]=useState(0);
  const [layers,setLayers]=useState({sensors:true,sensorLabels:false,equipment:true,zones:false,dataFlow:false});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    api.get("/api/laboratories?page=1&pageSize=100&status=active").then((response)=>{const list=response.data.laboratories??[];setLaboratories(list);setLaboratoryId(String(list[0]?.id??""));}).catch((requestError)=>setError(requestError.message)).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!laboratoryId)return undefined;
    let active=true;setError("");setSelectionKey(null);setCameraMode("overview");
    Promise.all([
      api.get(`/api/sensors?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`),
      api.get(`/api/equipment?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`),
      api.get(`/api/dashboard/summary?laboratoryId=${laboratoryId}&hours=24`),
      api.get(`/api/alerts?laboratoryId=${laboratoryId}&page=1&pageSize=100`),
    ]).then(([sensorResponse,equipmentResponse,dashboardResponse,alertResponse])=>{
      if(!active)return;setApiSensors(sensorResponse.data.sensors??[]);setApiEquipment(equipmentResponse.data.equipment??[]);setAlerts(alertResponse.data.alerts??[]);
      setApiReadings(Object.fromEntries((dashboardResponse.data.summary.latestSensorReadings??[]).map((reading)=>[String(reading.sensorId),reading])));
    }).catch((requestError)=>{if(active)setError(requestError.message);});
    const disconnect=connectMonitoringRealtime({laboratoryId,onEvent(eventName,payload){
      if(eventName==="sensor:reading")setApiReadings((current)=>({...current,[String(payload.sensorId)]:payload}));
      if(eventName==="energy:reading")setApiEnergy((current)=>({...current,[String(payload.equipmentId)]:payload}));
      if(["alert:created","alert:updated"].includes(eventName))setAlerts((current)=>[payload,...current.filter((item)=>String(item.id)!==String(payload.id))]);
      if(eventName==="equipment:updated")setApiEquipment((current)=>current.map((item)=>String(item.id)===String(payload.id)?{...item,...payload}:item));
    }});
    return()=>{active=false;disconnect();};
  },[laboratoryId]);

  const twin=useTwinSimulation({apiEquipment,apiSensors,apiReadings,apiEnergy,alerts});
  const selection=useMemo(()=>{
    if(!selectionKey)return null;const collection=selectionKey.kind==="sensor"?twin.sensors:twin.assets;const item=collection.find((candidate)=>candidate.id===selectionKey.id);return item?{kind:selectionKey.kind,item}:null;
  },[selectionKey,twin.assets,twin.sensors]);
  const telemetry=useMemo(()=>({
    now:twin.now,occupancy:twin.occupancy,temperature:twin.sensors.find((sensor)=>sensor.type==="temperature")?.value??22.4,humidity:twin.sensors.find((sensor)=>sensor.type==="humidity")?.value??48,
    energyWatts:twin.assets.reduce((sum,asset)=>sum+asset.energyWatts,0),alerts:twin.assets.filter((asset)=>asset.status==="alarm").length+twin.sensors.filter((sensor)=>sensor.state==="warning").length,
  }),[twin]);

  function selectObject(next){setSelectionKey(next?{kind:next.kind,id:next.item.id}:null);}
  function toggleLayer(name){setLayers((current)=>({...current,[name]:!current[name]}));}
  function resetCamera(){setCameraMode("overview");setResetNonce((value)=>value+1);}

  if(loading)return <div className="twin-page-state"><Box size={28}/><strong>Po përgatitet Digital Twin…</strong></div>;
  if(!laboratoryId)return <div className="twin-page-state"><Box size={28}/><strong>Nuk ka laborator aktiv</strong><p>Krijo një laborator për ta hapur mjedisin operacional 3D.</p></div>;

  return <section className="twin-page">
    <div className="twin-page-heading"><div><span>Laboratori virtual</span><h1>Digital Twin operacional</h1></div><label><span>Laboratori</span><select value={laboratoryId} onChange={(event)=>setLaboratoryId(event.target.value)}>{laboratories.map((laboratory)=><option key={laboratory.id} value={laboratory.id}>{laboratory.name} ({laboratory.code})</option>)}</select></label></div>
    {error&&<div className="twin-error" role="alert"><AlertTriangle size={18}/><span>{error}</span></div>}
    <div className={`twin-viewer ${selection?"has-selection":""}`}>
      <TwinTelemetryHeader telemetry={telemetry}/>
      <TwinViewerToolbar cameraMode={cameraMode} onCameraMode={(mode)=>{if(mode==="focus"&&!selection)return;setCameraMode(mode);}} onReset={resetCamera} layers={layers} onToggle={toggleLayer}/>
      <DigitalTwinCanvas assets={twin.assets} sensors={twin.sensors} selection={selection} onSelect={selectObject} layers={layers} cameraMode={cameraMode} resetNonce={resetNonce}/>
      <TwinSelectionPanel selection={selection} history={selection?twin.histories[selection.item.id]:[]} onClose={()=>setSelectionKey(null)} onFocus={()=>setCameraMode("focus")}/>
      {cameraMode==="walk"&&<div className="twin-walk-help">Kliko skenën · W A S D për lëvizje · Esc për dalje</div>}
    </div>
  </section>;
}
