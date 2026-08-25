/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide } from "three";
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

export function PlacedAssets({ items, visible, selectedId, onSelect }) {
  if(!visible)return null;
  return <group>{items.map(item=>{const position=[item.position.x,item.position.y,item.position.z],color=item.status==="critical"?"#D64C4C":item.status==="warning"?"#E0A43A":"#43D4E8";return <group key={item.id} position={position} rotation={[item.rotation.x,item.rotation.y,item.rotation.z]} onClick={event=>{event.stopPropagation();onSelect(item)}}>
    {item.assetType==="server_rack"?<mesh castShadow position={[0,1,0]}><boxGeometry args={[.75,2,.7]}/><meshStandardMaterial color="#303943" metalness={.65} roughness={.35}/></mesh>:item.assetType==="computer"?<mesh castShadow position={[0,.45,0]}><boxGeometry args={[.7,.5,.12]}/><meshStandardMaterial color="#20262d" metalness={.45} roughness={.28}/></mesh>:<mesh castShadow><sphereGeometry args={[.16,20,16]}/><meshStandardMaterial color="#d9dde0" metalness={.25} roughness={.32}/></mesh>}
    <mesh position={[0,.01,.02]}><ringGeometry args={[.2,.27,28]}/><meshBasicMaterial color={selectedId===item.id?"#ffffff":color} toneMapped={false}/></mesh>
  </group>})}</group>;
}
