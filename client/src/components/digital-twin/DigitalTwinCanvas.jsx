/* eslint-disable react/no-unknown-property */
import { ContactShadows, Html, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useCallback, useState } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { IoTDevices } from "./IoTDevices.jsx";
import { ClassroomFurnishings } from "./ClassroomFurnishings.jsx";
import { LaboratoryArchitecture } from "./LaboratoryArchitecture.jsx";
import { LaboratoryAssets } from "./LaboratoryAssets.jsx";
import { PlacedAssets, PlacementScene } from "./PlacementScene.jsx";
import { TwinCameraController } from "./TwinCameraController.jsx";
import { TwinDataFlows } from "./TwinDataFlows.jsx";
import { SecurityCameras } from "./SecurityCameras.jsx";
import { buildCameraRecords } from "./security-camera-records.js";
import { supportsWebGL } from "./webgl.js";

class TwinBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function ZoneLabels({ zones, visible, selectedId }) {
  if (!visible && !selectedId) return null;
  return <group>{zones.filter((zone)=>visible||zone.id===selectedId).map((zone) => <Html key={zone.id} center distanceFactor={18} position={[zone.center[0], 2.35, zone.center[1]]}><div className={`twin-zone-label ${zone.id===selectedId?"selected":""}`}><strong>{zone.name}</strong><span>{zone.code}</span></div></Html>)}</group>;
}

function Scene({ zones = [], assets, sensors, cameras=[], placements = [], placement, selection, onSelect, onContextMenu, onTransformEnd, transformMode, layers, cameraMode, resetNonce, ceilingMode, greenMode=false }) {
  const alarmAsset = assets.find((asset) => asset.status === "alarm");
  return <>
    <color attach="background" args={[greenMode?"#07120F":"#171D26"]} />
    <fog attach="fog" args={[greenMode?"#07120F":"#171D26", 30, 52]} />
    <ambientLight intensity={greenMode?.2:.46} color={greenMode?"#7EF0B0":"#FFFFFF"}/>
    <hemisphereLight args={[greenMode?"#75E5AE":"#DCE9F2",greenMode?"#07110D":"#49505A",greenMode?.55:1.15]} />
    <directionalLight castShadow intensity={greenMode?1.25:2.35} color={greenMode?"#B8FFD4":"#FFFFFF"} position={[-9, 15, 12]} shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-.00015} />
    {cameraMode === "walk" ? <PerspectiveCamera makeDefault position={[0,1.65,0]} fov={58} near={.08} far={80}/> : <OrthographicCamera makeDefault position={[15.5,17,17.5]} zoom={54} near={.1} far={100}/>} 
    <LaboratoryArchitecture zones={zones} visibleZones={layers.zones} alarmZoneId={alarmAsset?.zoneId} ceilingMode={cameraMode==="walk"?"closed":ceilingMode} walkMode={cameraMode==="walk"} selectedZoneId={selection?.kind==="zone"?selection.item.id:null} onZoneSelect={(item)=>onSelect({kind:"zone",item})}/>
    {!zones.length && <Html center><div className="twin-model-loading">Ky laborator nuk ka ende zona të konfiguruara.</div></Html>}
    <Suspense fallback={<Html center><div className="twin-model-loading">Po ngarkohen pajisjet 3D…</div></Html>}>
      <LaboratoryAssets assets={assets} visible={layers.equipment} selectedId={selection?.kind === "asset" ? selection.item.id : null} onSelect={(item) => onSelect({ kind: "asset", item })} />
      <ClassroomFurnishings zones={zones} visible={layers.equipment}/>
      <SecurityCameras records={cameras.length?cameras:buildCameraRecords(zones)} visible={layers.cameras} greenMode={greenMode} onSelect={(item)=>onSelect({kind:"camera",item})}/>
    </Suspense>
    <IoTDevices sensors={sensors} visible={layers.sensors} showLabels={layers.sensorLabels} greenMode={greenMode} selectedId={selection?.kind === "sensor" ? selection.item.id : null} onSelect={(item) => onSelect({ kind: "sensor", item })} />
    <Suspense fallback={null}><PlacedAssets items={placements} visible={layers.equipment||layers.sensors} selectedId={selection?.kind==="placement"?selection.item.id:null} transformMode={transformMode} onTransformEnd={onTransformEnd} onSelect={(item)=>onSelect({kind:"placement",item})} onContextMenu={onContextMenu}/></Suspense>
    {placement&&<PlacementScene placement={placement}/>}
    <TwinDataFlows sensors={sensors} assets={assets} visible={layers.dataFlow} />
    <ZoneLabels zones={zones} visible={layers.zones} selectedId={selection?.kind==="zone"?selection.item.id:null}/>
    <ContactShadows position={[0, .025, 0]} opacity={.3} scale={23} blur={2.2} far={6} resolution={256} frames={1} />
    <TwinCameraController mode={cameraMode} focusPosition={selection?.item?.position} resetNonce={resetNonce} zones={zones}/>
  </>;
}

function Fallback() { return <div className="twin-canvas-fallback" role="alert"><strong>Pamja 3D nuk mund të hapet</strong><p>Aktivizo WebGL dhe përshpejtimin grafik në shfletues.</p></div>; }

export function DigitalTwinCanvas(props) {
  const [canvasGeneration,setCanvasGeneration]=useState(0);
  const [recovering,setRecovering]=useState(false);
  const handleCreated=useCallback(({gl})=>{
    const canvas=gl.domElement;
    const recover=(event)=>{
      event.preventDefault();
      setRecovering(true);
      window.setTimeout(()=>{
        setCanvasGeneration((generation)=>generation+1);
        setRecovering(false);
      },80);
    };
    canvas.addEventListener("webglcontextlost",recover,{once:true});
  },[]);
  if (!supportsWebGL()) return <Fallback />;
  return <TwinBoundary fallback={<Fallback />}><div className="twin-canvas-shell" aria-label="Laboratori operacional 3D">{recovering&&<div className="twin-webgl-recovering" role="status">Po rikthehet pamja 3D…</div>}<Canvas key={canvasGeneration} onCreated={handleCreated} shadows="percentage" dpr={[1, 1.2]} frameloop="always" performance={{ min: .5, debounce: 350 }} gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, preserveDrawingBuffer: false }} onPointerMissed={() => props.onSelect(null)}><Scene {...props} /></Canvas></div></TwinBoundary>;
}
