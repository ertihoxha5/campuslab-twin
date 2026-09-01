/* eslint-disable react/no-unknown-property */
import { Center, Clone, RoundedBox, useGLTF } from "@react-three/drei";
import { memo, useMemo, useState } from "react";
import { Box3, Vector3 } from "three";
import { TWIN_COLORS } from "./twin-config.js";

const ROOT = "/models/digital-twin";
const MODELS = {
  robot: `${ROOT}/robot-arm.glb`, chair: `${ROOT}/SchoolChair_01/SchoolChair_01_1k.gltf`,
  desk: `${ROOT}/SchoolDesk_01/SchoolDesk_01_1k.gltf`, officeDesk: `${ROOT}/metal_office_desk/metal_office_desk_1k.gltf`,
  laptop: `${ROOT}/classic_laptop/classic_laptop_1k.gltf`, shelf: `${ROOT}/steel_frame_shelves_01/steel_frame_shelves_01_1k.gltf`,
  rack: `${ROOT}/worn_metal_rack/worn_metal_rack_1k.gltf`, camera: `${ROOT}/security_camera_01/security_camera_01_1k.gltf`,
  extinguisher: `${ROOT}/korean_fire_extinguisher_01/korean_fire_extinguisher_01_1k.gltf`, drill: `${ROOT}/drill_press_01/drill_press_01_1k.gltf`,
};
const statusColor = { operational: TWIN_COLORS.normal, maintenance: TWIN_COLORS.warning, alarm: TWIN_COLORS.danger, offline: "#77808B" };

function Model({ src, height, rotation = 0 }) {
  const gltf = useGLTF(src);
  const scale = useMemo(() => height / Math.max(new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y, .001), [gltf.scene, height]);
  return <group rotation={[0,rotation,0]} scale={scale}><Center top><Clone object={gltf.scene} castShadow receiveShadow /></Center></group>;
}
function InteractiveAsset({ asset, selected, onSelect, children }) {
  const [hovered,setHovered]=useState(false); const color=statusColor[asset.status]??statusColor.operational;
  return <group position={asset.position} onClick={(e)=>{e.stopPropagation();onSelect(asset);}} onPointerEnter={(e)=>{e.stopPropagation();setHovered(true);document.body.style.cursor="pointer";}} onPointerLeave={()=>{setHovered(false);document.body.style.cursor="default";}}>
    <group scale={hovered?1.018:1}>{children}</group>{(selected||hovered||asset.status==="alarm")&&<mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.45,.53,40]}/><meshBasicMaterial color={selected?TWIN_COLORS.cyan:color} transparent opacity={.9}/></mesh>}
  </group>;
}
function DashboardScreen({ position, rotation=0, wide=false }) { return <group position={position} rotation={[0,rotation,0]}><RoundedBox args={[wide?1.45:.66,wide?.82:.42,.055]} radius={.025}><meshStandardMaterial color="#151B22" metalness={.4} roughness={.2}/></RoundedBox><mesh position={[0,0,.031]}><planeGeometry args={[wide?1.34:.57,wide?.71:.33]}/><meshStandardMaterial color="#173C50" emissive="#2F91AD" emissiveIntensity={.34}/></mesh></group>; }
function RobotArm(){
  const {scene}=useGLTF(MODELS.robot);
  const fit=useMemo(()=>{const bounds=new Box3().setFromObject(scene);const size=bounds.getSize(new Vector3());const center=bounds.getCenter(new Vector3());return {scale:1.15/Math.max(size.y,.001),offset:[-center.x,-bounds.min.y,-center.z]};},[scene]);
  return <group><mesh castShadow receiveShadow position={[0,.11,0]}><cylinderGeometry args={[.44,.5,.22,40]}/><meshStandardMaterial color="#161B20" metalness={.72} roughness={.28}/></mesh><group position={[0,.22,0]} rotation={[0,-Math.PI/2,0]} scale={fit.scale}><group position={fit.offset}><Clone object={scene} castShadow receiveShadow/></group></group></group>;
}
function AssetModel({type}){if(type==="robot")return <RobotArm/>;if(type==="workstation")return <Model src={MODELS.officeDesk} height={.76}/>;if(type==="network-rack")return <Model src={MODELS.rack} height={2.05}/>;if(type==="storage-rack")return <Model src={MODELS.shelf} height={2.15} rotation={Math.PI/2}/>;if(type==="camera")return <Model src={MODELS.camera} height={.34} rotation={Math.PI}/>;if(type==="display")return <DashboardScreen position={[0,1.5,0]} wide/>;if(type==="alarm-panel")return <RoundedBox args={[.62,.82,.18]} radius={.04} position={[0,.82,0]}><meshStandardMaterial color="#D9DAD5"/></RoundedBox>;if(type==="emergency-stop")return <group><mesh position={[0,.57,0]}><cylinderGeometry args={[.045,.05,1.14,16]}/><meshStandardMaterial color="#D0A92E"/></mesh><mesh position={[0,1.13,0]}><cylinderGeometry args={[.14,.17,.14,24]}/><meshStandardMaterial color="#C53C3C"/></mesh></group>;return null;}
export const LaboratoryAssets=memo(function LaboratoryAssets({assets,visible,selectedId,onSelect}){if(!visible)return null;const renderedAssets=assets.filter((asset)=>!(/depo|storage|inventar/i.test(asset.zoneName??"")&&asset.type==="workstation"));return <group>{renderedAssets.map((asset)=><InteractiveAsset key={asset.id} asset={asset} selected={selectedId===asset.id} onSelect={onSelect}><AssetModel type={asset.type}/></InteractiveAsset>)}</group>;});
Object.values(MODELS).forEach((path)=>useGLTF.preload(path));
