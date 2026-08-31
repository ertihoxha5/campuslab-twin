import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box, FolderTree, LayoutDashboard } from "lucide-react";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { AssetPlacementPanel } from "@/components/digital-twin/AssetPlacementPanel.jsx";
import { DigitalTwinCanvas } from "@/components/digital-twin/DigitalTwinCanvas.jsx";
import { buildDynamicScene } from "@/components/digital-twin/dynamic-scene.js";
import { TwinOperationsPanel } from "@/components/digital-twin/TwinOperationsPanel.jsx";
import { TwinLaboratoryDashboard } from "@/components/digital-twin/TwinLaboratoryDashboard.jsx";
import { SECURITY_CAMERAS } from "@/components/digital-twin/security-camera-records.js";
import { SceneEditorPanel } from "@/components/digital-twin/SceneEditorPanel.jsx";
import { TwinSelectionPanel } from "@/components/digital-twin/TwinSelectionPanel.jsx";
import { TwinTelemetryHeader } from "@/components/digital-twin/TwinTelemetryHeader.jsx";
import { TwinViewerToolbar } from "@/components/digital-twin/TwinViewerToolbar.jsx";
import { useAssetPlacement } from "@/components/digital-twin/useAssetPlacement.js";
import { useTwinOperations } from "@/components/digital-twin/useTwinOperations.js";
import { useTwinSimulation } from "@/components/digital-twin/useTwinSimulation.js";
import { useAuthStore } from "@/stores/auth-store.js";
import "@/digital-twin.css";
import "@/digital-twin-dashboard.css";

export function DigitalTwinPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [apiSensors, setApiSensors] = useState([]);
  const [apiEquipment, setApiEquipment] = useState([]);
  const [laboratoryZones, setLaboratoryZones] = useState([]);
  const [apiReadings, setApiReadings] = useState({});
  const [apiEnergy, setApiEnergy] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [selectionKey, setSelectionKey] = useState(null);
  const [cameraMode, setCameraMode] = useState("overview");
  const [resetNonce, setResetNonce] = useState(0);
  const [layers, setLayers] = useState({ sensors: true, sensorLabels: false, equipment: true, zones: false, dataFlow: false, cameras: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operationsTab, setOperationsTab] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [ceilingMode, setCeilingMode] = useState("cutaway");
  const [greenMode, setGreenMode] = useState(false);
  const [transformMode, setTransformMode] = useState("translate");

  const operations = useTwinOperations({ laboratoryId, alerts, setAlerts });
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const canPlace = permissions.includes("assets.manage") || permissions.includes("assets.maintain");
  const placement = useAssetPlacement({ laboratoryId, placements: operations.placements, onSaved: operations.reload });
  const { onRealtime } = operations;

  useEffect(() => {
    api.get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => { const list = response.data.laboratories ?? []; setLaboratories(list); setLaboratoryId(String(list[0]?.id ?? "")); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!laboratoryId) return undefined;
    let active = true;
    setError(""); setSelectionKey(null); setCameraMode("overview"); setOperationsTab(null); setEditorOpen(false); setDashboardOpen(true);
    Promise.all([
      api.get(`/api/sensors?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`),
      api.get(`/api/equipment?laboratoryId=${laboratoryId}&page=1&pageSize=100&sort=name&direction=asc`),
      api.get(`/api/dashboard/summary?laboratoryId=${laboratoryId}&hours=24`),
      api.get(`/api/alerts?laboratoryId=${laboratoryId}&page=1&pageSize=100`),
      api.get(`/api/laboratories/${laboratoryId}/zones`),
    ]).then(([sensorResponse, equipmentResponse, dashboardResponse, alertResponse, zonesResponse]) => {
      if (!active) return;
      setApiSensors(sensorResponse.data.sensors ?? []);
      setApiEquipment(equipmentResponse.data.equipment ?? []);
      setAlerts(alertResponse.data.alerts ?? []);
      setLaboratoryZones(zonesResponse.data.zones ?? []);
      setApiReadings(Object.fromEntries((dashboardResponse.data.summary.latestSensorReadings ?? []).map((reading) => [String(reading.sensorId), reading])));
    }).catch((requestError) => { if (active) setError(requestError.message); });
    const disconnect = connectMonitoringRealtime({
      laboratoryId,
      onEvent(eventName, payload) {
        if (eventName === "sensor:reading") setApiReadings((current) => ({ ...current, [String(payload.sensorId)]: payload }));
        if (eventName === "energy:reading") setApiEnergy((current) => ({ ...current, [String(payload.equipmentId)]: payload }));
        if (["alert:created", "alert:updated"].includes(eventName)) setAlerts((current) => [payload, ...current.filter((item) => String(item.id) !== String(payload.id))]);
        if (eventName === "equipment:updated") setApiEquipment((current) => current.map((item) => String(item.id) === String(payload.id) ? { ...item, ...payload } : item));
        onRealtime(eventName, payload);
      },
    });
    return () => { active = false; disconnect(); };
  }, [laboratoryId, onRealtime]);

  const twin = useTwinSimulation({ apiEquipment, apiSensors, apiReadings, apiEnergy, alerts });
  const scene = useMemo(() => buildDynamicScene({ zones: laboratoryZones, equipment: apiEquipment, sensors: apiSensors, readings: apiReadings, energy: apiEnergy, alerts }), [alerts, apiEnergy, apiEquipment, apiReadings, apiSensors, laboratoryZones]);
  const activeLaboratory = laboratories.find((laboratory) => String(laboratory.id) === String(laboratoryId));
  const selection = useMemo(() => {
    if (!selectionKey) return null;
    const collection = selectionKey.kind === "sensor" ? scene.sensors : selectionKey.kind === "camera" ? SECURITY_CAMERAS : selectionKey.kind === "placement" ? operations.placements : scene.assets;
    const item = collection.find((candidate) => String(candidate.id) === String(selectionKey.id));
    return item ? { kind: selectionKey.kind, item: { ...item, type: item.type ?? item.assetType, energyWatts: item.energyWatts ?? 0, maintenance: item.maintenance ?? item.status, lastUpdate: item.lastUpdate ?? item.updatedAt ?? new Date().toISOString() } } : null;
  }, [operations.placements, scene.assets, scene.sensors, selectionKey]);
  const telemetry = useMemo(() => ({ now: twin.now, occupancy: scene.sensors.find((sensor) => sensor.type === "occupancy")?.value ?? twin.occupancy, temperature: scene.sensors.find((sensor) => sensor.type === "temperature")?.value ?? 22.4, humidity: scene.sensors.find((sensor) => sensor.type === "humidity")?.value ?? 48, energyWatts: scene.assets.reduce((sum, asset) => sum + asset.energyWatts, 0), alerts: alerts.filter((alert) => !["resolved", "closed"].includes(alert.status)).length }), [alerts, scene.assets, scene.sensors, twin.now, twin.occupancy]);

  function selectObject(next) { if (!placement.open) { setOperationsTab(null); setEditorOpen(false); setDashboardOpen(false); setSelectionKey(next ? { kind: next.kind, id: next.item.id } : null); } }
  function openOperations(tab) { setSelectionKey(null); setEditorOpen(false); setDashboardOpen(false); setOperationsTab(tab); }
  function toggleLayer(name) { setLayers((current) => ({ ...current, [name]: !current[name] })); }
  function resetCamera() { setCameraMode("overview"); setResetNonce((value) => value + 1); }
  async function resetSelected() { if (selection?.kind === "placement") await operations.updatePlacement(selection.item, { rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }); }
  async function duplicateSelected() { if (selection?.kind === "placement") selectObject({ kind: "placement", item: await operations.duplicatePlacement(selection.item) }); }
  async function deleteSelected() { if (selection?.kind !== "placement" || !window.confirm(`Ta hiqni “${selection.item.name}” nga skena?`)) return; await operations.removePlacement(selection.item); setSelectionKey(null); }

  if (loading) return <div className="twin-page-state"><Box size={28}/><strong>Po përgatitet Digital Twin…</strong></div>;
  if (!laboratoryId) return <div className="twin-page-state"><Box size={28}/><strong>Nuk ka laborator aktiv</strong><p>Krijo një laborator për ta hapur mjedisin operacional 3D.</p></div>;

  return <section className="twin-page">
    <div className="twin-page-heading"><div><span>Laboratori virtual</span><h1>Digital Twin operacional</h1></div><label><span>Laboratori</span><select value={laboratoryId} onChange={(event) => setLaboratoryId(event.target.value)}>{laboratories.map((laboratory) => <option key={laboratory.id} value={laboratory.id}>{laboratory.name} ({laboratory.code})</option>)}</select></label></div>
    {error && <div className="twin-error" role="alert"><AlertTriangle size={18}/><span>{error}</span></div>}
    <div className="twin-workspace">
      <TwinTelemetryHeader telemetry={telemetry}/>
      <div className={`twin-viewer ${selection ? "has-selection" : ""}`}>
        <TwinViewerToolbar cameraMode={cameraMode} onCameraMode={(mode) => { if (mode !== "focus" || selection) setCameraMode(mode); }} onReset={resetCamera} layers={layers} onToggle={toggleLayer} ceilingMode={ceilingMode} onCeilingMode={() => setCeilingMode((current) => current === "cutaway" ? "transparent" : current === "transparent" ? "closed" : "cutaway")} greenMode={greenMode} onGreenMode={() => { setGreenMode((current) => !current); setLayers((current) => ({...current,sensors:true,cameras:true,sensorLabels:true})); }}/>
        <TwinOperationsPanel operations={operations} openTab={operationsTab} onOpen={openOperations} onClose={() => setOperationsTab(null)}/>
        <button type="button" className={`twin-dashboard-toggle ${dashboardOpen ? "active" : ""}`} onClick={() => { setOperationsTab(null); setSelectionKey(null); setEditorOpen(false); setDashboardOpen((current) => !current); }}><LayoutDashboard size={16}/><span>Dashboard</span></button>
        {canPlace && <button type="button" className={`twin-editor-toggle ${editorOpen ? "active" : ""}`} onClick={() => { setOperationsTab(null); setSelectionKey(null); setDashboardOpen(false); setEditorOpen((current) => !current); }}><FolderTree size={16}/><span>Objektet</span></button>}
        {canPlace && !placement.open && <button type="button" className="twin-add-asset" onClick={() => placement.begin()}>+ Shto pajisje</button>}
        {editorOpen && <SceneEditorPanel operations={operations} selection={selection} onSelect={selectObject} onAdd={placement.begin} canManage={canPlace} transformMode={transformMode} onTransformMode={setTransformMode} onReset={resetSelected} onDuplicate={duplicateSelected} onDelete={deleteSelected}/>}
        {dashboardOpen && <TwinLaboratoryDashboard laboratory={activeLaboratory} zones={scene.zones} assets={scene.assets} sensors={scene.sensors} onClose={() => setDashboardOpen(false)} onSelect={selectObject}/>}
        <DigitalTwinCanvas zones={scene.zones} assets={scene.assets} sensors={scene.sensors} placements={operations.placements} placement={placement} selection={selection} onSelect={selectObject} onTransformEnd={(item, changes) => operations.updatePlacement(item, changes)} transformMode={selection?.kind === "placement" && canPlace ? transformMode : null} layers={layers} cameraMode={cameraMode} resetNonce={resetNonce} ceilingMode={ceilingMode} greenMode={greenMode}/>
        <AssetPlacementPanel placement={placement}/>
        <TwinSelectionPanel selection={selection} history={selection ? twin.histories[selection.item.id] ?? [] : []} onClose={() => setSelectionKey(null)} onFocus={() => setCameraMode("focus")}/>
        {cameraMode === "walk" && <div className="twin-walk-help">Kliko skenën · W A S D për lëvizje · Esc për dalje</div>}
      </div>
    </div>
  </section>;
}
