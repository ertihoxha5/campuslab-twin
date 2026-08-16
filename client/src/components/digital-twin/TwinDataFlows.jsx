import { Line } from "@react-three/drei";
import { memo } from "react";
import { TWIN_COLORS } from "./twin-config.js";

export const TwinDataFlows = memo(function TwinDataFlows({ sensors, assets, visible }) {
  if (!visible) return null;
  return <group>{sensors.filter((sensor)=>sensor.assetId).map((sensor)=>{
    const asset=assets.find((item)=>item.id===sensor.assetId);
    if(!asset)return null;
    return <Line key={sensor.id} points={[sensor.position,[asset.position[0],Math.max(.55,asset.position[1]+.55),asset.position[2]]]} color={sensor.state==="warning"?TWIN_COLORS.warning:TWIN_COLORS.cyan} lineWidth={.65} transparent opacity={.55} dashed dashSize={.12} gapSize={.09}/>;
  })}</group>;
});
