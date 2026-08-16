/* eslint-disable react/no-unknown-property */
import { RoundedBox } from "@react-three/drei";
import { TWIN_COLORS, TWIN_ZONES } from "./twin-config.js";

const WALL_HEIGHT = 2.8;
const WALL_THICKNESS = 0.16;

function Wall({ position, size, glass = false }) {
  return (
    <mesh castShadow={!glass} receiveShadow position={position}>
      <boxGeometry args={size} />
      {glass ? (
        <meshPhysicalMaterial color="#B9D5DC" transmission={0.55} thickness={0.08} transparent opacity={0.62} roughness={0.08} metalness={0.05} />
      ) : (
        <meshStandardMaterial color={TWIN_COLORS.offWhite} roughness={0.82} metalness={0.02} />
      )}
    </mesh>
  );
}

function Door({ position, rotation = 0, emergency = false }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox castShadow args={[0.95, 2.12, 0.11]} radius={0.035} position={[0, 1.06, 0]}>
        <meshStandardMaterial color={emergency ? "#404A42" : "#9A7A55"} roughness={0.48} />
      </RoundedBox>
      <mesh position={[0.35, 1.03, 0.075]}><sphereGeometry args={[0.045, 14, 10]} /><meshStandardMaterial color="#B9A36A" metalness={0.8} /></mesh>
      {emergency && <group position={[0, 2.38, 0]}><mesh><boxGeometry args={[0.82, 0.25, 0.08]} /><meshStandardMaterial color="#26734B" emissive="#26734B" emissiveIntensity={0.75} /></mesh></group>}
    </group>
  );
}

function CableTray({ position, length, rotation = 0 }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh><boxGeometry args={[length, .035, .28]} /><meshStandardMaterial color="#6C737B" metalness={.82} roughness={.28} /></mesh>
    {Array.from({ length: Math.floor(length / .5) }, (_, index) => <mesh key={index} position={[-length/2+.25+index*.5,.03,0]}><boxGeometry args={[.025,.05,.3]} /><meshStandardMaterial color="#555C64" metalness={.8}/></mesh>)}
  </group>;
}

function WindowBank() {
  return <group position={[-9.75, 1.55, 0]}>{[-4.7,-3.1,-1.5,.1,1.7,3.3,4.9].map((z) => <group key={z} position={[0,0,z]}>
    <Wall position={[0,0,0]} size={[.08,1.65,1.35]} glass />
    <mesh position={[.02,0,0]}><boxGeometry args={[.07,1.78,.045]} /><meshStandardMaterial color="#59636D" metalness={.72}/></mesh>
  </group>)}</group>;
}

export function LaboratoryArchitecture({ visibleZones = true, alarmZoneId }) {
  return <group>
    <mesh receiveShadow position={[0,-.12,0]}><boxGeometry args={[20,.24,13]} /><meshPhysicalMaterial color="#AEB3B7" roughness={.4} clearcoat={.28} clearcoatRoughness={.35}/></mesh>
    <mesh receiveShadow position={[0,.012,0]}><boxGeometry args={[19.6,.03,12.6]} /><meshStandardMaterial color="#C8CBCB" roughness={.62}/></mesh>

    <Wall position={[0,WALL_HEIGHT/2,6.35]} size={[20,WALL_HEIGHT,WALL_THICKNESS]} />
    <Wall position={[-9.92,WALL_HEIGHT/2,0]} size={[WALL_THICKNESS,WALL_HEIGHT,12.7]} />
    <Wall position={[9.92,WALL_HEIGHT/2,0]} size={[WALL_THICKNESS,WALL_HEIGHT,12.7]} />
    <Wall position={[-1.75,WALL_HEIGHT/2,3.45]} size={[WALL_THICKNESS,WALL_HEIGHT,5.8]} glass />
    <Wall position={[-2.5,WALL_HEIGHT/2,-3.55]} size={[WALL_THICKNESS,WALL_HEIGHT,5]} />
    <Wall position={[2.5,WALL_HEIGHT/2,-3.55]} size={[WALL_THICKNESS,WALL_HEIGHT,5]} glass />
    <Wall position={[3,WALL_HEIGHT/2,0.4]} size={[13.8,WALL_HEIGHT,WALL_THICKNESS]} glass />
    <Wall position={[-6,WALL_HEIGHT/2,0.4]} size={[7.8,WALL_HEIGHT,WALL_THICKNESS]} />
    <WindowBank />

    <Door position={[-4.4,0,.48]} />
    <Door position={[.2,0,.48]} />
    <Door position={[-2.42,0,-2.9]} rotation={Math.PI/2} />
    <Door position={[2.42,0,-2.9]} rotation={-Math.PI/2} />
    <Door position={[9.8,0,-3.5]} rotation={-Math.PI/2} emergency />

    <CableTray position={[0,2.48,6.12]} length={19.2} />
    <CableTray position={[-9.62,2.48,0]} length={12} rotation={Math.PI/2}/>
    {[-7,-3,1,5].map((x)=><group key={x} position={[x,2.55,0]}><mesh><boxGeometry args={[2.25,.07,.48]}/><meshStandardMaterial color="#FAF9F2" emissive="#FFFDF2" emissiveIntensity={1.2}/></mesh><pointLight position={[0,-.35,0]} intensity={.52} distance={5.2}/></group>)}

    {[-8,-4,0,4,8].map((x)=><group key={x} position={[x,.35,6.22]}><mesh><boxGeometry args={[.42,.22,.06]}/><meshStandardMaterial color="#ECEBE6"/></mesh>{[-.1,.1].map(dx=><mesh key={dx} position={[dx,0,.035]}><boxGeometry args={[.045,.085,.02]}/><meshStandardMaterial color="#3E444A"/></mesh>)}</group>)}

    {TWIN_ZONES.map((zone) => <group key={zone.id} position={[zone.center[0],.025,zone.center[1]]}>
      <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[zone.size[0]-.18,zone.size[1]-.18]} /><meshBasicMaterial color={alarmZoneId === zone.id ? TWIN_COLORS.danger : zone.color} transparent opacity={alarmZoneId === zone.id ? .16 : visibleZones ? .045 : 0}/></mesh>
      {visibleZones && <mesh position={[0,.018,0]}><boxGeometry args={[zone.size[0]-.12,.018,zone.size[1]-.12]}/><meshBasicMaterial color={zone.color} transparent opacity={.035}/></mesh>}
    </group>)}
  </group>;
}
