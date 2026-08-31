/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";
import { memo, useState } from "react";
import { TWIN_COLORS } from "./twin-config.js";

const sensorColor = { normal: TWIN_COLORS.cyan, warning: TWIN_COLORS.warning, alarm: TWIN_COLORS.danger, offline: "#78828C" };

function DeviceBody({ type, color, greenMode }) {
  if (/smoke|occupancy|presence/.test(type)) return <group rotation={[Math.PI/2,0,0]}><mesh castShadow><cylinderGeometry args={[.16,.19,.08,28]}/><meshPhysicalMaterial color="#E8E9E6" roughness={.32}/></mesh><mesh position={[0,.048,0]}><torusGeometry args={[.095,.018,10,24]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={greenMode?1.4:.55}/></mesh></group>;
  if (/door/.test(type)) return <group><RoundedBoxLike/><mesh position={[.09,0,0]}><boxGeometry args={[.055,.26,.06]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={greenMode?1.2:.5}/></mesh></group>;
  return <group><mesh castShadow><boxGeometry args={[.25,.34,.09]}/><meshPhysicalMaterial color="#E7E9E7" roughness={.3}/></mesh><mesh position={[0,.02,.051]}><planeGeometry args={[.14,.1]}/><meshStandardMaterial color="#18242D" emissive={color} emissiveIntensity={.48}/></mesh><mesh position={[0,-.105,.052]}><sphereGeometry args={[.018,10,8]}/><meshStandardMaterial color={color} emissive={color}/></mesh></group>;
}

function RoundedBoxLike() { return <mesh><boxGeometry args={[.08,.32,.07]}/><meshPhysicalMaterial color="#ECEDE9" roughness={.28}/></mesh>; }

export const IoTDevices = memo(function IoTDevices({ sensors, visible, selectedId, onSelect, showLabels, greenMode=false }) {
  return <group>{sensors.map((sensor)=><SensorDevice key={sensor.id} sensor={sensor} visible={visible} selected={selectedId===sensor.id} onSelect={onSelect} showLabel={showLabels} greenMode={greenMode}/>)}</group>;
});

function SensorDevice({ sensor, visible, selected, onSelect, showLabel, greenMode }) {
  const [hovered,setHovered]=useState(false);
  if (!visible) return null;
  const color=sensorColor[sensor.state]??sensorColor.normal;
  return <group position={sensor.position} onClick={(event)=>{event.stopPropagation();onSelect(sensor);}} onPointerEnter={(event)=>{event.stopPropagation();setHovered(true);document.body.style.cursor="pointer";}} onPointerLeave={()=>{setHovered(false);document.body.style.cursor="default";}}>
    <group scale={selected||hovered?1.22:1}><DeviceBody type={sensor.type} color={color} greenMode={greenMode}/></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.11,0]}><ringGeometry args={[.18,.23,28]}/><meshBasicMaterial color={color} transparent opacity={selected?.95:.56}/></mesh>
    {sensor.state!=="offline"&&<pointLight color={color} intensity={greenMode?1.15:sensor.state==="warning"?.75:.2} distance={greenMode?2.2:1.4}/>}
    {(showLabel||selected)&&<Html center distanceFactor={14} position={[0,.42,0]}><button type="button" className={`twin-spatial-label state-${sensor.state}`} onClick={()=>onSelect(sensor)}><strong>{sensor.name}</strong><span>{sensor.value} {sensor.unit}</span></button></Html>}
  </group>;
}
