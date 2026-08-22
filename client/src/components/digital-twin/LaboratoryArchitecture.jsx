/* eslint-disable react/no-unknown-property */
import { CeilingSystem } from "./CeilingSystem.jsx";
import { WallSystem } from "./WallSystem.jsx";
import { TWIN_COLORS,TWIN_ZONES } from "./twin-config.js";

function ZoneState({visible,alarmZoneId}){return <group>{TWIN_ZONES.map(zone=><group key={zone.id} position={[zone.center[0],.025,zone.center[1]]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[zone.size[0]-.18,zone.size[1]-.18]}/><meshBasicMaterial color={alarmZoneId===zone.id?TWIN_COLORS.danger:zone.color} transparent opacity={alarmZoneId===zone.id?.18:visible?.035:0}/></mesh></group>)}</group>;}
export function LaboratoryArchitecture({visibleZones=true,alarmZoneId,ceilingMode="cutaway",walkMode=false}){return <group><mesh receiveShadow position={[0,-.12,0]}><boxGeometry args={[20,.24,13]}/><meshPhysicalMaterial color="#969C9E" roughness={.46} clearcoat={.18}/></mesh><mesh receiveShadow position={[0,.012,0]}><boxGeometry args={[19.62,.035,12.62]}/><meshStandardMaterial color="#B8BCBC" roughness={.68}/></mesh><WallSystem walkMode={walkMode}/><CeilingSystem mode={walkMode?"closed":ceilingMode}/><ZoneState visible={visibleZones} alarmZoneId={alarmZoneId}/></group>;}
