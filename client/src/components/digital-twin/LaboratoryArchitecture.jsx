/* eslint-disable react/no-unknown-property */
import { Clone, RoundedBox, useGLTF } from "@react-three/drei";
import { useMemo,useState } from "react";
import { Box3, Vector3 } from "three";
import { TWIN_COLORS } from "./twin-config.js";

const WALL=.18;
const DOOR_MODEL="/models/digital-twin/door-single.glb";
const close=(a,b)=>Math.abs(a-b)<.04;

function Wall({position,size,color="#D7D8D5"}) {
  return <RoundedBox castShadow receiveShadow position={position} args={size} radius={.025} smoothness={3}><meshStandardMaterial color={color} roughness={.7} metalness={.025}/></RoundedBox>;
}
function planFor(zones) {
  if(!zones.length)return null;
  const minX=Math.min(...zones.map((z)=>z.center[0]-z.size[0]/2));
  const maxX=Math.max(...zones.map((z)=>z.center[0]+z.size[0]/2));
  const minZ=Math.min(...zones.map((z)=>z.center[1]-z.size[1]/2));
  const maxZ=Math.max(...zones.map((z)=>z.center[1]+z.size[1]/2));
  const height=Math.max(2.7,...zones.map((z)=>z.wallHeight??2.8));
  const edges=[];
  zones.forEach((zone)=>{
    const [x,z]=zone.center,[width,depth]=zone.size;
    const candidates=[
      {axis:"x",fixed:z-depth/2,start:x-width/2,end:x+width/2},
      {axis:"x",fixed:z+depth/2,start:x-width/2,end:x+width/2},
      {axis:"z",fixed:x-width/2,start:z-depth/2,end:z+depth/2},
      {axis:"z",fixed:x+width/2,start:z-depth/2,end:z+depth/2},
    ];
    const interior=candidates.filter((edge)=>!(edge.axis==="x"?(close(edge.fixed,minZ)||close(edge.fixed,maxZ)):(close(edge.fixed,minX)||close(edge.fixed,maxX))));
    const entrance=[...interior].sort((a,b)=>Math.abs(a.fixed-(a.axis==="x"?((minZ+maxZ)/2):((minX+maxX)/2)))-Math.abs(b.fixed-(b.axis==="x"?((minZ+maxZ)/2):((minX+maxX)/2))))[0];
    candidates.forEach((edge)=>{
      const exterior=edge.axis==="x"?(close(edge.fixed,minZ)||close(edge.fixed,maxZ)):(close(edge.fixed,minX)||close(edge.fixed,maxX));
      if(exterior)return;
      const key=`${edge.axis}:${edge.fixed.toFixed(2)}:${edge.start.toFixed(2)}:${edge.end.toFixed(2)}`;
      const existing=edges.find((item)=>item.key===key);const isEntrance=edge===entrance;
      if(existing)existing.door=existing.door||isEntrance;else edges.push({...edge,key,door:isEntrance});
    });
  });
  return {minX,maxX,minZ,maxZ,width:maxX-minX,depth:maxZ-minZ,center:[(minX+maxX)/2,(minZ+maxZ)/2],height,edges};
}
function Floor({zone,visibleZones,alarm,selected,onSelect}) {
  const [width,depth]=zone.size;
  const [hovered,setHovered]=useState(false);
  return <group position={[zone.center[0],0,zone.center[1]]}><mesh receiveShadow position={[0,.012,0]} rotation={[-Math.PI/2,0,0]} onClick={(event)=>{event.stopPropagation();onSelect?.(zone);}} onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)}><planeGeometry args={[Math.max(.1,width-.08),Math.max(.1,depth-.08)]}/><meshPhysicalMaterial color="#AEB4B5" roughness={.46} clearcoat={.13}/></mesh><mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[Math.max(.1,width-.18),Math.max(.1,depth-.18)]}/><meshStandardMaterial color={alarm?TWIN_COLORS.danger:zone.color} transparent opacity={alarm?.2:(selected?.18:hovered?.12:(visibleZones?.07:.012))} roughness={.82}/></mesh></group>;
}
function Door({axis,fixed,middle,height=2.15}) {
  const {scene}=useGLTF(DOOR_MODEL);
  const fit=useMemo(()=>{
    const bounds=new Box3().setFromObject(scene);const size=bounds.getSize(new Vector3());const center=bounds.getCenter(new Vector3());
    return {scale:Math.min(.9/Math.max(size.x,.001),height/Math.max(size.y,.001)),offset:[-center.x,-bounds.min.y,-center.z]};
  },[height,scene]);
  const rotation=axis==="x"?0:Math.PI/2;
  const position=axis==="x"?[middle,0,fixed]:[fixed,0,middle];
  return <group position={position} rotation={[0,rotation,0]} scale={fit.scale}><group position={fit.offset}><Clone object={scene} castShadow receiveShadow/></group></group>;
}
function WallWithDoor({edge,height,color}) {
  const length=edge.end-edge.start;const opening=Math.min(.95,Math.max(.72,length*.25));const middle=(edge.start+edge.end)/2;const segment=(length-opening)/2;
  if(segment<.35) { const position=edge.axis==="x"?[middle,height/2,edge.fixed]:[edge.fixed,height/2,middle];const size=edge.axis==="x"?[length,height,WALL]:[WALL,height,length];return <Wall position={position} size={size} color={color}/>; }
  const first=(edge.start+middle-opening/2)/2;const second=(middle+opening/2+edge.end)/2;
  const firstPosition=edge.axis==="x"?[first,height/2,edge.fixed]:[edge.fixed,height/2,first];const secondPosition=edge.axis==="x"?[second,height/2,edge.fixed]:[edge.fixed,height/2,second];const size=edge.axis==="x"?[segment,height,WALL]:[WALL,height,segment];
  return <group><Wall position={firstPosition} size={size} color={color}/><Wall position={secondPosition} size={size} color={color}/><Wall position={edge.axis==="x"?[middle,height-.18,edge.fixed]:[edge.fixed,height-.18,middle]} size={edge.axis==="x"?[opening,.36,WALL]:[WALL,.36,opening]} color={color}/><Door axis={edge.axis} fixed={edge.fixed} middle={middle}/></group>;
}
function Partitions({plan}) {
  return <group>{plan.edges.map((edge)=>{if(edge.door)return <WallWithDoor key={edge.key} edge={edge} height={plan.height} color="#CFD1CF"/>;const length=edge.end-edge.start;const middle=(edge.start+edge.end)/2;return <Wall key={edge.key} position={edge.axis==="x"?[middle,plan.height/2,edge.fixed]:[edge.fixed,plan.height/2,middle]} size={edge.axis==="x"?[length,plan.height,WALL]:[WALL,plan.height,length]} color="#CFD1CF"/>;})}</group>;
}
function Envelope({plan,walkMode}) {
  const frontHeight=walkMode?plan.height:.34;
  return <group><Wall position={[plan.center[0],plan.height/2,plan.minZ]} size={[plan.width+WALL,plan.height,WALL]}/><Wall position={[plan.minX,plan.height/2,plan.center[1]]} size={[WALL,plan.height,plan.depth+WALL]}/><Wall position={[plan.maxX,plan.height/2,plan.center[1]]} size={[WALL,plan.height,plan.depth+WALL]}/><Wall position={[plan.center[0],frontHeight/2,plan.maxZ]} size={[plan.width+WALL,frontHeight,WALL]} color="#BFC3C2"/><Wall position={[plan.center[0],.11,plan.minZ+.11]} size={[plan.width-.12,.2,.07]} color="#626A6E"/></group>;
}
function Utilities({plan}) {
  const count=Math.max(2,Math.floor(plan.width/3));
  return <group><mesh position={[plan.center[0],plan.height-.28,plan.minZ+.1]}><boxGeometry args={[plan.width-.35,.085,.1]}/><meshStandardMaterial color="#667078" metalness={.7} roughness={.34}/></mesh>{Array.from({length:count},(_,index)=>{const x=plan.minX+1+(index*(plan.width-2))/Math.max(1,count-1);return <RoundedBox key={index} position={[x,.43,plan.minZ+.105]} args={[.2,.14,.04]} radius={.014}><meshStandardMaterial color="#F2F0E9"/></RoundedBox>;})}</group>;
}
function Lighting({zones,plan}) { return <group>{zones.map((zone)=><group key={zone.id} position={[zone.center[0],plan.height-.1,zone.center[1]]}><mesh><boxGeometry args={[Math.min(1.5,zone.size[0]*.42),.055,.34]}/><meshStandardMaterial color="#F4F4EC" emissive="#FFF9D8" emissiveIntensity={1.1}/></mesh><pointLight position={[0,-.15,0]} intensity={2.1} distance={Math.max(...zone.size)*.8} decay={2}/></group>)}</group>; }
function BuildingSlab({plan}) { return <RoundedBox receiveShadow position={[plan.center[0],-.18,plan.center[1]]} args={[plan.width+.5,.34,plan.depth+.5]} radius={.1} smoothness={4}><meshStandardMaterial color="#5D6365" roughness={.72}/></RoundedBox>; }

export function LaboratoryArchitecture({zones=[],visibleZones=true,alarmZoneId,ceilingMode="cutaway",walkMode=false,selectedZoneId,onZoneSelect}) {
  const plan=useMemo(()=>planFor(zones),[zones]);
  if(!plan)return null;
  return <group><BuildingSlab plan={plan}/>{zones.map((zone)=><Floor key={zone.id} zone={zone} visibleZones={visibleZones} alarm={alarmZoneId===zone.id} selected={selectedZoneId===zone.id} onSelect={onZoneSelect}/>)}<Envelope plan={plan} walkMode={walkMode}/><Partitions plan={plan}/><Utilities plan={plan}/><Lighting zones={zones} plan={plan}/>{ceilingMode!=="cutaway"&&<mesh receiveShadow position={[plan.center[0],plan.height,plan.center[1]]}><boxGeometry args={[plan.width+.18,.1,plan.depth+.18]}/><meshPhysicalMaterial color="#E3E3DF" transparent={ceilingMode==="transparent"} opacity={ceilingMode==="transparent"?.16:1}/></mesh>}</group>;
}
useGLTF.preload(DOOR_MODEL);
