/* eslint-disable react/no-unknown-property */
import { Center,Clone,useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3,Vector3 } from "three";
const SRC="/models/digital-twin/security_camera_01/security_camera_01_1k.gltf";
function CameraUnit({record,onSelect,greenMode}) { const model=useGLTF(SRC);const scale=useMemo(()=>.32/Math.max(new Box3().setFromObject(model.scene).getSize(new Vector3()).y,.001),[model.scene]);return <group position={record.position} rotation={record.rotation} onClick={(event)=>{event.stopPropagation();onSelect?.(record);}}><group scale={scale}><Center><Clone object={model.scene} castShadow/></Center></group><mesh position={[.42,-.32,.42]} rotation={[Math.PI/2,0,-Math.PI/4]}><coneGeometry args={[.52,1.35,20,1,true]}/><meshBasicMaterial color={greenMode?"#67F0A0":"#43D4E8"} transparent opacity={greenMode?.16:.065} depthWrite={false}/></mesh><mesh position={[0,.12,0]}><sphereGeometry args={[.045,12,8]}/><meshBasicMaterial color="#4FD18B" toneMapped={false}/></mesh></group>; }
export function SecurityCameras({records=[],visible,onSelect,greenMode=false}) { if(!visible)return null;return <group>{records.map((camera)=><CameraUnit key={camera.id} record={camera} onSelect={onSelect} greenMode={greenMode}/>)}</group>; }
useGLTF.preload(SRC);
