/* eslint-disable react/no-unknown-property */
import { Html, Line } from "@react-three/drei";
import { equipmentMarkerPosition } from "./equipment-position.js";

const zoneColors = {
  general: "#58427c",
  teaching: "#436f75",
  research: "#6c7653",
  storage: "#9c6b30",
  restricted: "#8c3939",
  safety: "#3f6f52",
};

export function ZoneOverlays({ zones, visible }) {
  if (!visible) return null;
  return zones.map((zone) => {
    const position = zone.position ?? {};
    const dimensions = zone.dimensions ?? {};
    const width = Math.max(0.2, Number(dimensions.width ?? 1));
    const height = Math.max(0.2, Number(dimensions.height ?? 1));
    const depth = Math.max(0.2, Number(dimensions.depth ?? 1));
    const color = zoneColors[zone.zoneType] ?? zoneColors.general;
    return (
      <group
        key={zone.id}
        position={[
          Number(position.x ?? 0),
          Number(position.y ?? 0) + height / 2,
          Number(position.z ?? 0),
        ]}
      >
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} transparent opacity={0.1} depthWrite={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
        </mesh>
        <Html center distanceFactor={12} position={[0, height / 2 + 0.18, 0]}>
          <div className="digital-twin-zone-label">
            <strong>{zone.name}</strong>
            <span>{zone.zoneType}</span>
          </div>
        </Html>
      </group>
    );
  });
}

export function DataFlowLines({ sensors, equipment, zones, visible }) {
  if (!visible) return null;
  return sensors.flatMap((sensor) => {
    if (!sensor.equipmentId) return [];
    const equipmentIndex = equipment.findIndex(
      (item) => String(item.id) === String(sensor.equipmentId),
    );
    if (equipmentIndex < 0) return [];
    const target = equipmentMarkerPosition(
      equipment[equipmentIndex],
      zones,
      equipmentIndex,
    );
    const source = [
      Number(sensor.positionX ?? 0),
      Number(sensor.positionY ?? 0) + 0.18,
      Number(sensor.positionZ ?? 0),
    ];
    return [
      <Line
        key={`${sensor.id}:${sensor.equipmentId}`}
        points={[source, target]}
        color="#58427c"
        lineWidth={1.4}
        dashed
        dashSize={0.16}
        gapSize={0.1}
        transparent
        opacity={0.8}
      />,
    ];
  });
}
