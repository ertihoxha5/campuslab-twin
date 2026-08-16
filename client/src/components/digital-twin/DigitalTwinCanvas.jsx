/* eslint-disable react/no-unknown-property */
import { ContactShadows, Html, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { IoTDevices } from "./IoTDevices.jsx";
import { LaboratoryArchitecture } from "./LaboratoryArchitecture.jsx";
import { LaboratoryAssets } from "./LaboratoryAssets.jsx";
import { OccupancyAgents } from "./OccupancyAgents.jsx";
import { TwinCameraController } from "./TwinCameraController.jsx";
import { TwinDataFlows } from "./TwinDataFlows.jsx";
import { TWIN_ZONES } from "./twin-config.js";
import { supportsWebGL } from "./webgl.js";

class TwinBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function ZoneLabels({ visible }) {
  if (!visible) return null;
  return <group>{TWIN_ZONES.map((zone) => <Html key={zone.id} center distanceFactor={18} position={[zone.center[0], 2.35, zone.center[1]]}><div className="twin-zone-label"><strong>{zone.name}</strong><span>{zone.code}</span></div></Html>)}</group>;
}

function Scene({ assets, sensors, selection, onSelect, layers, cameraMode, resetNonce }) {
  const alarmAsset = assets.find((asset) => asset.status === "alarm");
  const occupancy = sensors.find((sensor) => sensor.type === "occupancy")?.value ?? 0;
  return <>
    <color attach="background" args={["#171D26"]} />
    <fog attach="fog" args={["#171D26", 30, 52]} />
    <ambientLight intensity={.46} />
    <hemisphereLight args={["#DCE9F2", "#49505A", 1.15]} />
    <directionalLight castShadow intensity={2.35} position={[-9, 15, 12]} shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-.00015} />
    <PerspectiveCamera makeDefault position={[15.5, 17, 17.5]} fov={42} near={.1} far={80} />
    <LaboratoryArchitecture visibleZones={layers.zones} alarmZoneId={alarmAsset?.zoneId} />
    <Suspense fallback={<Html center><div className="twin-model-loading">Po ngarkohen pajisjet 3D…</div></Html>}>
      <LaboratoryAssets assets={assets} visible={layers.equipment} selectedId={selection?.kind === "asset" ? selection.item.id : null} onSelect={(item) => onSelect({ kind: "asset", item })} />
    </Suspense>
    <IoTDevices sensors={sensors} visible={layers.sensors} showLabels={layers.sensorLabels} selectedId={selection?.kind === "sensor" ? selection.item.id : null} onSelect={(item) => onSelect({ kind: "sensor", item })} />
    <TwinDataFlows sensors={sensors} assets={assets} visible={layers.dataFlow} />
    <OccupancyAgents count={occupancy} />
    <ZoneLabels visible={layers.zones} />
    <ContactShadows position={[0, .025, 0]} opacity={.28} scale={24} blur={2.4} far={8} resolution={512} />
    <TwinCameraController mode={cameraMode} focusPosition={selection?.item?.position} resetNonce={resetNonce} />
  </>;
}

function Fallback() { return <div className="twin-canvas-fallback" role="alert"><strong>Pamja 3D nuk mund të hapet</strong><p>Aktivizo WebGL dhe përshpejtimin grafik në shfletues.</p></div>; }

export function DigitalTwinCanvas(props) {
  if (!supportsWebGL()) return <Fallback />;
  return <TwinBoundary fallback={<Fallback />}><div className="twin-canvas-shell" aria-label="Laboratori operacional 3D"><Canvas shadows dpr={[1, 1.5]} frameloop="always" performance={{ min: .55, debounce: 250 }} gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} onPointerMissed={() => props.onSelect(null)}><Scene {...props} /></Canvas></div></TwinBoundary>;
}
