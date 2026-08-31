/* eslint-disable react/no-unknown-property */
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import { Vector3 } from "three";
import { TWIN_COLORS } from "./twin-config.js";

function FlowConnection({sensor,asset,index}) {
  const pulse=useRef();const start=new Vector3(...sensor.position);const end=new Vector3(asset.position[0],Math.max(.55,asset.position[1]+.55),asset.position[2]);const color=sensor.state==="alarm"?TWIN_COLORS.danger:sensor.state==="warning"?TWIN_COLORS.warning:TWIN_COLORS.cyan;
  useFrame(({clock})=>{if(!pulse.current)return;const progress=(clock.elapsedTime*.28+index*.23)%1;pulse.current.position.lerpVectors(start,end,progress);});
  return <group><Line points={[start,end]} color={color} lineWidth={.8} transparent opacity={.5} dashed dashScale={2.5} dashSize={.12} gapSize={.1}/><mesh ref={pulse}><sphereGeometry args={[.065,12,8]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh></group>;
}
export const TwinDataFlows=memo(function TwinDataFlows({sensors,assets,visible}) { if(!visible)return null;return <group>{sensors.filter((sensor)=>sensor.assetId).map((sensor,index)=>{const asset=assets.find((item)=>item.id===sensor.assetId);return asset?<FlowConnection key={sensor.id} sensor={sensor} asset={asset} index={index}/>:null;})}</group>; });
