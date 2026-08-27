/* eslint-disable react/no-unknown-property */
import { Center,Clone,Html,TransformControls,useGLTF } from "@react-three/drei";
import { useMemo,useRef } from "react";
import { Box3,DoubleSide,Vector3 } from "three";
import { sceneZoneFor, snapPlacement } from "./placement-geometry.js";

function Ghost({ placement }) {
  const { position, rotation } = placement.draft;
  if (!position) return null;
  const color = placement.validation.valid ? "#43D4E8" : "#D64C4C";
  const sensor = !["computer","server_rack","security_camera"].includes(placement.draft.assetType);
  return <group position={[position.x,position.y,position.z]} rotation={[rotation.x,rotation.y,rotation.z]}>
    {placement.draft.assetType==="server_rack"?<mesh position={[0,1,0]}><boxGeometry args={[.75,2,.7]}/><meshStandardMaterial color={color} transparent opacity={.45}/></mesh>:placement.draft.assetType==="computer"?<mesh position={[0,.45,0]}><boxGeometry args={[.7,.5,.12]}/><meshStandardMaterial color={color} transparent opacity={.5}/></mesh>:<mesh><sphereGeometry args={[sensor?.16:.25,20,16]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.4} transparent opacity={.68}/></mesh>}
    <Html center position={[0,.45,0]}><div className={`twin-placement-hint ${placement.validation.valid?"valid":"invalid"}`}>{placement.validation.valid?"Kliko për ta vendosur":"Pozitë e pavlefshme"}</div></Html>
  </group>;
}

export function PlacementScene({ placement }) {
  const mapped=sceneZoneFor(placement.zone);
  const surface=placement.draft.mountingSurface;
  const materials=useMemo(()=>({transparent:true,opacity:.001,side:DoubleSide,depthWrite:false}),[]);
  if(!placement.open||!mapped)return null;
  const commit=(event,rotation)=>{event.stopPropagation();placement.place(snapPlacement(event.point,surface),rotation);};
  return <group>
    {surface==="floor"&&<mesh position={[mapped.center[0],.07,mapped.center[1]]} rotation={[-Math.PI/2,0,0]} onPointerMove={commit} onClick={commit}><planeGeometry args={mapped.size}/><meshBasicMaterial {...materials}/></mesh>}
    {surface==="ceiling"&&<mesh position={[mapped.center[0],2.72,mapped.center[1]]} rotation={[-Math.PI/2,0,0]} onPointerMove={commit} onClick={commit}><planeGeometry args={mapped.size}/><meshBasicMaterial {...materials}/></mesh>}
    {surface==="wall"&&<group>
      <mesh position={[-9.65,1.4,mapped.center[1]]} rotation={[0,Math.PI/2,0]} onPointerMove={e=>commit(e,{x:0,y:Math.PI/2,z:0})} onClick={e=>commit(e,{x:0,y:Math.PI/2,z:0})}><planeGeometry args={[mapped.size[1],2.5]}/><meshBasicMaterial {...materials}/></mesh>
      <mesh position={[9.65,1.4,mapped.center[1]]} rotation={[0,-Math.PI/2,0]} onPointerMove={e=>commit(e,{x:0,y:-Math.PI/2,z:0})} onClick={e=>commit(e,{x:0,y:-Math.PI/2,z:0})}><planeGeometry args={[mapped.size[1],2.5]}/><meshBasicMaterial {...materials}/></mesh>
      <mesh position={[mapped.center[0],1.4,-6.05]} onPointerMove={e=>commit(e,{x:0,y:0,z:0})} onClick={e=>commit(e,{x:0,y:0,z:0})}><planeGeometry args={[mapped.size[0],2.5]}/><meshBasicMaterial {...materials}/></mesh>
      <mesh position={[mapped.center[0],1.4,6.05]} rotation={[0,Math.PI,0]} onPointerMove={e=>commit(e,{x:0,y:Math.PI,z:0})} onClick={e=>commit(e,{x:0,y:Math.PI,z:0})}><planeGeometry args={[mapped.size[0],2.5]}/><meshBasicMaterial {...materials}/></mesh>
    </group>}
    <Ghost placement={placement}/>
  </group>;
}

const ROOT="/models/digital-twin",BUILT_IN={chair:`${ROOT}/SchoolChair_01/SchoolChair_01_1k.gltf`,desk:`${ROOT}/SchoolDesk_01/SchoolDesk_01_1k.gltf`,computer:`${ROOT}/classic_laptop/classic_laptop_1k.gltf`,monitor:`${ROOT}/classic_laptop/classic_laptop_1k.gltf`,camera:`${ROOT}/security_camera_01/security_camera_01_1k.gltf`,sensor:`${ROOT}/security_camera_01/security_camera_01_1k.gltf`,server_rack:`${ROOT}/worn_metal_rack/worn_metal_rack_1k.gltf`,router:`${ROOT}/worn_metal_rack/worn_metal_rack_1k.gltf`};
function VisualModel({item}){const src=item.visualAssetKind==="model_3d"?item.downloadUrl:BUILT_IN[item.builtInKey];if(!src)return <mesh castShadow><sphereGeometry args={[.16,20,16]}/><meshStandardMaterial color="#d9dde0" metalness={.25} roughness={.32}/></mesh>;return <LoadedModel src={src}/>;}
function LoadedModel({src}){const gltf=useGLTF(src);const scale=useMemo(()=>1/Math.max(new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y,.001),[gltf.scene]);return <group scale={scale}><Center top><Clone object={gltf.scene} castShadow receiveShadow/></Center></group>;}
function PlacedItem({item,selected,transformMode,onSelect,onTransformEnd}){const ref=useRef();const color=item.status==="critical"?"#D64C4C":item.status==="warning"?"#E0A43A":"#43D4E8";const content=<group ref={ref} position={[item.position.x,item.position.y,item.position.z]} rotation={[item.rotation.x,item.rotation.y,item.rotation.z]} scale={[item.scale?.x??1,item.scale?.y??1,item.scale?.z??1]} visible={item.visible!==false} onClick={event=>{event.stopPropagation();onSelect(item)}}><VisualModel item={item}/><mesh position={[0,.01,.02]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.2,.27,28]}/><meshBasicMaterial color={selected?"#ffffff":color} toneMapped={false}/></mesh></group>;if(!selected||!transformMode)return content;return <TransformControls mode={transformMode} translationSnap={.25} rotationSnap={Math.PI/12} scaleSnap={.1} onMouseUp={()=>{const object=ref.current;if(object)onTransformEnd(item,{position:{x:object.position.x,y:object.position.y,z:object.position.z},rotation:{x:object.rotation.x,y:object.rotation.y,z:object.rotation.z},scale:{x:object.scale.x,y:object.scale.y,z:object.scale.z}});}}>{content}</TransformControls>;}
export function PlacedAssets({ items, visible, selectedId, transformMode, onTransformEnd, onSelect }) {
  if(!visible)return null;
  return <group>{items.map(item=><PlacedItem key={item.id} item={item} selected={selectedId===item.id} transformMode={transformMode} onTransformEnd={onTransformEnd} onSelect={onSelect}/>)}</group>;
}
