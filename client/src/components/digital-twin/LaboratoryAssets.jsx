/* eslint-disable react/no-unknown-property */
import { Clone, RoundedBox, useGLTF } from "@react-three/drei";
import { memo, useState } from "react";
import { TWIN_COLORS } from "./twin-config.js";

const stateColor = { operational: TWIN_COLORS.normal, maintenance: TWIN_COLORS.warning, alarm: TWIN_COLORS.danger, offline: "#77808B" };

function InteractiveAsset({ asset, selected, visible, onSelect, children }) {
  const [hovered, setHovered] = useState(false);
  if (!visible) return null;
  const color = stateColor[asset.status] ?? stateColor.operational;
  return <group
    position={asset.position}
    onClick={(event) => { event.stopPropagation(); onSelect(asset); }}
    onPointerEnter={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
    onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
  >
    <group scale={hovered ? 1.025 : 1}>{children}</group>
    {(selected || hovered || asset.status === "alarm") && <mesh position={[0,-asset.position[1]+.035,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.48,.57,32]}/><meshBasicMaterial color={selected ? TWIN_COLORS.purple : color} transparent opacity={.9}/></mesh>}
    <pointLight position={[0,.5,0]} color={color} intensity={asset.status === "alarm" ? 1.2 : selected ? .45 : 0} distance={2.2}/>
  </group>;
}

function Screen({ position = [0,1.15,0], rotation = 0, width = .7 }) {
  return <group position={position} rotation={[0,rotation,0]}>
    <RoundedBox castShadow args={[width,.46,.055]} radius={.025}><meshStandardMaterial color="#171C22" metalness={.2} roughness={.25}/></RoundedBox>
    <mesh position={[0,0,.031]}><planeGeometry args={[width-.08,.36]}/><meshStandardMaterial color="#1A3450" emissive="#4A7AB7" emissiveIntensity={.42}/></mesh>
    {[0,.12,-.12].map((y,index)=><mesh key={y} position={[-.13,y,.034]}><planeGeometry args={[.22,.015]}/><meshBasicMaterial color={index===0?"#55D5E8":"#8B72BC"}/></mesh>)}
    <mesh position={[0,-.34,0]}><cylinderGeometry args={[.035,.045,.22,12]}/><meshStandardMaterial color="#454D55" metalness={.65}/></mesh>
  </group>;
}

function Chair({ position, rotation = 0 }) {
  const model = useGLTF("/models/digital-twin/sheen-chair.glb");
  return <group position={position} rotation={[0,rotation,0]} scale={1.25}><Clone object={model.scene} castShadow receiveShadow /></group>;
}

function Workstation({ dual = true }) {
  return <group>
    <RoundedBox castShadow receiveShadow args={[1.75,.09,.78]} radius={.035} position={[0,.72,0]}><meshPhysicalMaterial color="#B9986D" roughness={.48} clearcoat={.15}/></RoundedBox>
    {[-.76,.76].map(x=><mesh castShadow key={x} position={[x,.35,0]}><boxGeometry args={[.075,.7,.63]}/><meshStandardMaterial color="#414850" metalness={.62} roughness={.3}/></mesh>)}
    {dual ? <><Screen position={[-.42,1.14,-.16]} rotation={.08}/><Screen position={[.42,1.14,-.16]} rotation={-.08}/></> : <Screen position={[0,1.14,-.16]} width={.85}/>} 
    <RoundedBox args={[.55,.025,.19]} radius={.018} position={[0,.79,.2]}><meshStandardMaterial color="#252B31" roughness={.5}/></RoundedBox>
    <Chair position={[0,0,.85]} rotation={Math.PI}/>
  </group>;
}

function NetworkRack() {
  return <group><RoundedBox castShadow args={[.78,2.05,.75]} radius={.045} position={[0,1.025,0]}><meshPhysicalMaterial color="#1D232A" metalness={.72} roughness={.25}/></RoundedBox>
    {Array.from({length:8},(_,index)=><group key={index} position={[0,.28+index*.205,.381]}><mesh><boxGeometry args={[.65,.14,.025]}/><meshStandardMaterial color="#333C45" metalness={.55}/></mesh>{[0,.09,.18].map((x,i)=><mesh key={x} position={[.18+x,0,.018]}><sphereGeometry args={[.018,8,6]}/><meshStandardMaterial color={i===2&&index===4?TWIN_COLORS.warning:TWIN_COLORS.normal} emissive={i===2&&index===4?TWIN_COLORS.warning:TWIN_COLORS.normal} emissiveIntensity={.8}/></mesh>)}</group>)}
  </group>;
}

function RobotArm() {
  return <group>
    <mesh castShadow position={[0,.12,0]}><cylinderGeometry args={[.46,.54,.24,32]}/><meshPhysicalMaterial color="#303942" metalness={.72} roughness={.24}/></mesh>
    <group position={[0,.34,0]} rotation={[0,.25,-.25]}><mesh castShadow position={[0,.48,0]}><capsuleGeometry args={[.16,.72,16,24]}/><meshPhysicalMaterial color="#D8D9D4" metalness={.48} roughness={.2}/></mesh><mesh castShadow position={[0,.93,0]}><sphereGeometry args={[.22,24,16]}/><meshStandardMaterial color="#6D8790" metalness={.6}/></mesh><group position={[0,1.02,0]} rotation={[0,0,.82]}><mesh castShadow position={[0,.42,0]}><capsuleGeometry args={[.14,.62,16,24]}/><meshPhysicalMaterial color="#D8D9D4" metalness={.48} roughness={.2}/></mesh><mesh position={[0,.82,0]}><sphereGeometry args={[.18,24,16]}/><meshStandardMaterial color="#6D8790" metalness={.6}/></mesh><group position={[0,.94,0]} rotation={[0,0,-.48]}><mesh castShadow position={[0,.22,0]}><capsuleGeometry args={[.105,.34,14,20]}/><meshPhysicalMaterial color="#D8D9D4" metalness={.5}/></mesh><mesh position={[0,.47,0]}><boxGeometry args={[.25,.18,.25]}/><meshStandardMaterial color="#252B32" metalness={.7}/></mesh></group></group></group>
  </group>;
}

function StorageRack() {
  return <group>{[-.62,.62].map(x=><mesh castShadow key={x} position={[x,1,0]}><boxGeometry args={[.07,2,.62]}/><meshStandardMaterial color="#4B535B" metalness={.7}/></mesh>)}{[.22,.72,1.22,1.72].map((y,index)=><group key={y}><mesh castShadow position={[0,y,0]}><boxGeometry args={[1.32,.07,.62]}/><meshStandardMaterial color="#555E67" metalness={.65}/></mesh>{[-.4,0,.4].map((x,i)=><RoundedBox castShadow key={x} args={[.34,.26,.46]} radius={.025} position={[x,y+.17,0]}><meshStandardMaterial color={["#7A6548","#475E69","#59664A"][(index+i)%3]} roughness={.7}/></RoundedBox>)}</group>)}</group>;
}

function SafetyPanel() { return <group><RoundedBox castShadow args={[.62,.82,.16]} radius={.035} position={[0,.82,0]}><meshStandardMaterial color="#E9E9E4" roughness={.42}/></RoundedBox><mesh position={[0,.88,.085]}><boxGeometry args={[.34,.16,.018]}/><meshStandardMaterial color="#22313C" emissive="#D64C4C" emissiveIntensity={.24}/></mesh><mesh position={[0,.57,.09]}><sphereGeometry args={[.07,14,10]}/><meshStandardMaterial color="#D64C4C" emissive="#D64C4C" emissiveIntensity={.7}/></mesh></group>; }

function Display() { return <group><RoundedBox castShadow args={[.13,1.45,2.35]} radius={.04} position={[0,1.45,0]} rotation={[0,Math.PI/2,0]}><meshStandardMaterial color="#171D24" roughness={.22}/></RoundedBox><mesh position={[.075,1.45,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[2.18,1.28]}/><meshStandardMaterial color="#18324B" emissive="#537FBD" emissiveIntensity={.38}/></mesh></group>; }

function StaticFixtures() {
  return <group>
    <group position={[1.3,.018,3.5]}>{[[-1.35,-1],[1.35,-1],[-1.35,1],[1.35,1]].map(([x,z])=><group key={`${x}:${z}`} position={[x,0,z]}><mesh position={[0,.62,0]}><cylinderGeometry args={[.025,.03,1.24,10]}/><meshStandardMaterial color="#D7B43A" metalness={.35}/></mesh><mesh position={[0,1.18,0]}><sphereGeometry args={[.055,12,8]}/><meshStandardMaterial color="#252B37"/></mesh></group>)}
      {[[-1.35,0,.08,2],[1.35,0,.08,2],[0,-1,2.7,.08],[0,1,2.7,.08]].map(([x,z,w,d],i)=><mesh key={i} position={[x,.035,z]}><boxGeometry args={[w,.025,d]}/><meshStandardMaterial color="#E0A43A" roughness={.7}/></mesh>)}
    </group>
    <group position={[3.8,.82,3.3]}>{[-.55,-.2,.15,.5].map((x,index)=><group key={x} position={[x,0,0]} rotation={[0,0,(index-1.5)*.12]}><mesh><cylinderGeometry args={[.025,.035,.42,10]}/><meshStandardMaterial color={["#3B6B9A","#B44B4B","#4B5058","#D2A13C"][index]}/></mesh><mesh position={[0,.23,0]}><boxGeometry args={[.13,.08,.05]}/><meshStandardMaterial color="#242B32"/></mesh></group>)}</group>
    <group position={[4.3,0,-4.8]}><mesh castShadow position={[0,.47,0]}><cylinderGeometry args={[.16,.22,.72,20]}/><meshPhysicalMaterial color="#C53F3F" roughness={.38}/></mesh><mesh position={[0,.88,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.14,.028,10,18,Math.PI]}/><meshStandardMaterial color="#252B37"/></mesh></group>
    <group position={[5.2,.95,-5.7]}><RoundedBox castShadow args={[.65,.8,.15]} radius={.035}><meshStandardMaterial color="#ECEDE8" roughness={.4}/></RoundedBox><mesh position={[0,0,.08]}><boxGeometry args={[.32,.09,.02]}/><meshStandardMaterial color="#338153"/></mesh><mesh position={[0,0,.081]} rotation={[0,0,Math.PI/2]}><boxGeometry args={[.32,.09,.02]}/><meshStandardMaterial color="#338153"/></mesh></group>
    <group position={[5.8,.025,-3.5]}>{[[-1.65,-1.45],[1.65,-1.45],[-1.65,1.45],[1.65,1.45]].map(([x,z])=><mesh key={`${x}:${z}`} position={[x,0,z]}><boxGeometry args={[.34,.025,.09]}/><meshStandardMaterial color="#D64C4C"/></mesh>)}</group>
    <group position={[-8.55,.55,4.1]}><mesh castShadow><cylinderGeometry args={[.2,.2,1.1,20]}/><meshStandardMaterial color="#8A929A" metalness={.72}/></mesh><mesh position={[0,.2,.205]}><planeGeometry args={[.24,.36]}/><meshStandardMaterial color="#172B3B" emissive="#43D4E8" emissiveIntensity={.25}/></mesh></group>
  </group>;
}

function AssetBody({ type }) {
  if (type === "workstation") return <Workstation/>;
  if (type === "network-rack") return <NetworkRack/>;
  if (type === "robot") return <RobotArm/>;
  if (type === "storage-rack") return <StorageRack/>;
  if (type === "alarm-panel") return <SafetyPanel/>;
  if (type === "display") return <Display/>;
  if (type === "camera") return <group><mesh><boxGeometry args={[.3,.22,.42]}/><meshPhysicalMaterial color="#EBECE8" roughness={.24}/></mesh><mesh position={[0,0,.23]}><cylinderGeometry args={[.09,.09,.08,20]}/><meshPhysicalMaterial color="#15232B" metalness={.45}/></mesh></group>;
  if (type === "emergency-stop") return <group><mesh position={[0,.6,0]}><cylinderGeometry args={[.055,.055,1.2,12]}/><meshStandardMaterial color="#D5B63D"/></mesh><mesh position={[0,1.18,0]}><cylinderGeometry args={[.16,.18,.16,20]}/><meshStandardMaterial color="#D64C4C" emissive="#D64C4C" emissiveIntensity={.35}/></mesh></group>;
  return null;
}

export const LaboratoryAssets = memo(function LaboratoryAssets({ assets, visible, selectedId, onSelect }) {
  return <group>{assets.map((asset)=><InteractiveAsset key={asset.id} asset={asset} visible={visible} selected={selectedId===asset.id} onSelect={onSelect}><AssetBody type={asset.type}/></InteractiveAsset>)}
    {[-7.8,-6.2,-4.6].flatMap((x)=>[-2.3,-4.4].map((z)=><group key={`${x}:${z}`} position={[x,0,z]} scale={.78}><Workstation dual={false}/></group>))}
    <group position={[3.8,0,3.3]}><RoundedBox castShadow args={[1.8,.1,.85]} radius={.04} position={[0,.76,0]}><meshPhysicalMaterial color="#A9865F" roughness={.48}/></RoundedBox>{[-.75,.75].map(x=><mesh key={x} position={[x,.38,0]}><boxGeometry args={[.08,.76,.7]}/><meshStandardMaterial color="#414850" metalness={.6}/></mesh>)}</group>
    <StaticFixtures />
  </group>;
});

useGLTF.preload("/models/digital-twin/sheen-chair.glb");
