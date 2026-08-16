/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";

const routes = [[-7,-3.4],[-5.6,-3.1],[-4.5,-4.2],[-1.2,.1],[1,.1],[3,.1],[5,-3.4],[1.4,3.4],[-6,3.2],[-4.8,4.3],[-.4,-3.2],[.9,-4.2]];

export const OccupancyAgents = memo(function OccupancyAgents({ count }) {
  const group=useRef();
  const people=useMemo(()=>routes.slice(0,Math.min(12,Math.max(0,Math.round(count)))),[count]);
  useFrame((_state,delta)=>{if(!group.current)return;group.current.userData.time=(group.current.userData.time??0)+delta;group.current.children.forEach((person,index)=>{const time=group.current.userData.time*.32+index;person.position.x=people[index][0]+Math.sin(time)*.18;person.position.z=people[index][1]+Math.cos(time*.8)*.14;person.rotation.y=-time;});});
  return <group ref={group}>{people.map((position,index)=><group key={index} position={[position[0],0,position[1]]}>
    <mesh castShadow position={[0,1.58,0]}><sphereGeometry args={[.12,16,12]}/><meshStandardMaterial color={index%2?"#9A674F":"#C18A6B"} roughness={.72}/></mesh>
    <mesh castShadow position={[0,1.08,0]}><capsuleGeometry args={[.17,.48,8,12]}/><meshStandardMaterial color={["#6D4FA3","#435E69","#6E7A4F","#4A5360"][index%4]} roughness={.66}/></mesh>
    {[-.09,.09].map((x)=><mesh castShadow key={x} position={[x,.42,0]}><capsuleGeometry args={[.055,.48,6,10]}/><meshStandardMaterial color="#303740" roughness={.7}/></mesh>)}
  </group>)}</group>;
});
