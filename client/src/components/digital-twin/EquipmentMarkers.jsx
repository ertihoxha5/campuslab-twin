/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";

const statusColors = {
  active: "#6c7653",
  inactive: "#6b7280",
  fault: "#b53e3e",
  maintenance: "#58427c",
};

function markerPosition(equipment, zones, index) {
  const zone = zones.find((item) => String(item.id) === String(equipment.zoneId));
  if (zone) {
    const offset = ((index % 5) - 2) * 0.32;
    return [
      Number(zone.positionX ?? 0) + offset,
      Number(zone.positionY ?? 0) + 0.42,
      Number(zone.positionZ ?? 0),
    ];
  }
  return [-5.4 + (index % 4) * 1.1, 0.45, 3.55 - Math.floor(index / 4) * 0.75];
}

export function EquipmentMarkers({ equipment, zones, visible, onSelect }) {
  if (!visible) return null;

  return equipment.map((item, index) => {
    const color = statusColors[item.status] ?? statusColors.inactive;
    return (
      <group key={item.id} position={markerPosition(item, zones, index)}>
        <mesh
          castShadow
          rotation={[0, Math.PI / 4, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(item);
          }}
        >
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} />
        </mesh>
        <Html center distanceFactor={10} position={[0, 0.38, 0]}>
          <button
            type="button"
            className={`digital-twin-equipment-label ${item.status}`}
            onClick={() => onSelect?.(item)}
          >
            <strong>{item.name}</strong>
            <span>{item.status}</span>
          </button>
        </Html>
      </group>
    );
  });
}
