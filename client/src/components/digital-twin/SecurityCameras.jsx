/* eslint-disable react/no-unknown-property */
import { Clone,useGLTF } from "@react-three/drei";
import { SECURITY_CAMERAS } from "./security-camera-records.js";
const SRC="/models/digital-twin/security_camera_01/security_camera_01_1k.gltf";
function CameraUnit({record,onSelect}){const model=useGLTF(SRC);return <group position={record.position} rotation={record.rotation} onClick={e=>{e.stopPropagation();onSelect?.(record);}}><group scale={1.8} rotation={[0,Math.PI,0]}><Clone object={model.scene} castShadow/></group><mesh position={[0,-.15,.8]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.72,1.7,20,1,true]}/><meshBasicMaterial color="#43D4E8" transparent opacity={.075} depthWrite={false}/></mesh></group>;}
export function SecurityCameras({visible,onSelect}){if(!visible)return null;return <group>{SECURITY_CAMERAS.map(camera=><CameraUnit key={camera.id} record={{...camera,lastUpdate:new Date().toISOString()}} onSelect={onSelect}/>)}</group>;}
useGLTF.preload(SRC);
