/* eslint-disable react/no-unknown-property */
import { Center, Clone, useGLTF } from "@react-three/drei";
import { memo, useMemo } from "react";
import { Box3, Vector3 } from "three";

const ROOT="/models/digital-twin";
const DESK=`${ROOT}/SchoolDesk_01/SchoolDesk_01_1k.gltf`;
const CHAIR=`${ROOT}/SchoolChair_01/SchoolChair_01_1k.gltf`;

function Model({src,height}) { const gltf=useGLTF(src);const scale=useMemo(()=>height/Math.max(new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y,.001),[gltf.scene,height]);return <group scale={scale}><Center top><Clone object={gltf.scene} castShadow receiveShadow/></Center></group>; }
function Classroom({zone}) {
  const columns=zone.size[0]>5?3:2;const rows=2;const usableX=Math.max(1,zone.size[0]-1.5);const usableZ=Math.max(1,zone.size[1]-1.5);
  return <group>{Array.from({length:columns*rows},(_,index)=>{const col=index%columns,row=Math.floor(index/columns);const x=zone.center[0]-usableX/2+(col+.5)*(usableX/columns);const z=zone.center[1]-usableZ/2+(row+.5)*(usableZ/rows);return <group key={index} position={[x,0,z]}><Model src={DESK} height={.72}/><group position={[0,0,.58]} rotation={[0,Math.PI,0]}><Model src={CHAIR} height={.82}/></group></group>;})}</group>;
}
export const ClassroomFurnishings=memo(function ClassroomFurnishings({zones=[],visible=true}) { if(!visible)return null;return <group>{zones.filter((zone)=>/m[eë]sim|class|learning/i.test(`${zone.name} ${zone.code}`)).map((zone)=><Classroom key={zone.id} zone={zone}/>)}</group>; });
useGLTF.preload(DESK);useGLTF.preload(CHAIR);
