/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";
import {
  localizedLabel,
  operationalStatusLabels,
} from "@/utils/localization.js";
import { equipmentMarkerPosition } from "./equipment-position.js";

const statusColors = {
  active: "#6c7653",
  inactive: "#6b7280",
  fault: "#b53e3e",
  maintenance: "#58427c",
};

export function EquipmentMarkers({ equipment, zones, visible, onSelect }) {
  if (!visible) return null;

  return equipment.map((item, index) => {
    const color = statusColors[item.status] ?? statusColors.inactive;
    return (
      <group
        key={item.id}
        position={equipmentMarkerPosition(item, zones, index)}
      >
        <mesh
          castShadow
          rotation={[0, Math.PI / 4, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(item);
          }}
        >
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.32}
          />
        </mesh>
        <Html center distanceFactor={10} position={[0, 0.38, 0]}>
          <button
            type="button"
            className={`digital-twin-equipment-label ${item.status}`}
            onClick={() => onSelect?.(item)}
          >
            <strong>{item.name}</strong>
            <span>{localizedLabel(operationalStatusLabels, item.status)}</span>
          </button>
        </Html>
      </group>
    );
  });
}
