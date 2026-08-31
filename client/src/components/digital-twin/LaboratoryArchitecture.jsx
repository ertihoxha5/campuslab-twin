/* eslint-disable react/no-unknown-property */
import { TWIN_COLORS } from "./twin-config.js";

const wallMaterial = <meshStandardMaterial color="#D8D9D6" roughness={.72} metalness={.03}/>;

function Wall({ position, size }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={size}/>{wallMaterial}</mesh>;
}

function LaboratoryZone({ zone, visibleZones, alarmZoneId, ceilingMode, walkMode }) {
  const [width, depth] = zone.size;
  const height = Math.max(2.45, zone.wallHeight ?? 2.8);
  const wall = .14;
  const frontHeight = walkMode ? height : .38;
  return <group position={[zone.center[0], 0, zone.center[1]]}>
    <mesh receiveShadow position={[0, -.08, 0]}><boxGeometry args={[width, .16, depth]}/><meshPhysicalMaterial color="#AEB3B4" roughness={.58} clearcoat={.12}/></mesh>
    <mesh position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[Math.max(.1, width - .12), Math.max(.1, depth - .12)]}/><meshStandardMaterial color={zone.color} transparent opacity={visibleZones ? .15 : .035} roughness={.82}/></mesh>
    <Wall position={[0, height / 2, -depth / 2]} size={[width, height, wall]}/>
    <Wall position={[-width / 2, height / 2, 0]} size={[wall, height, depth]}/>
    <Wall position={[width / 2, height / 2, 0]} size={[wall, height, depth]}/>
    <Wall position={[0, frontHeight / 2, depth / 2]} size={[width, frontHeight, wall]}/>
    {alarmZoneId === zone.id && <mesh position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[width - .2, depth - .2]}/><meshBasicMaterial color={TWIN_COLORS.danger} transparent opacity={.24}/></mesh>}
    {ceilingMode !== "cutaway" && <mesh receiveShadow position={[0, height, 0]}><boxGeometry args={[width, .1, depth]}/><meshPhysicalMaterial color="#E3E3DF" transparent={ceilingMode === "transparent"} opacity={ceilingMode === "transparent" ? .16 : 1}/></mesh>}
  </group>;
}

export function LaboratoryArchitecture({ zones = [], visibleZones = true, alarmZoneId, ceilingMode = "cutaway", walkMode = false }) {
  return <group>{zones.map((zone) => <LaboratoryZone key={zone.id} zone={zone} visibleZones={visibleZones} alarmZoneId={alarmZoneId} ceilingMode={ceilingMode} walkMode={walkMode}/>)}</group>;
}
