/* eslint-disable react/no-unknown-property */
import { occupancyRepresentation } from "./occupancy.js";

const shirts = ["#58427c", "#6c7653", "#436f75", "#9c6b30"];

function Figure({ index }) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = -2.4 + column * 1.6 + (row % 2) * 0.28;
  const z = 3.45 - row * 0.72;
  return (
    <group position={[x, 0, z]} rotation={[0, index % 2 ? -0.35 : 0.35, 0]}>
      <mesh castShadow position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color={index % 3 ? "#b98262" : "#8f624b"} roughness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 1.17, 0]}>
        <capsuleGeometry args={[0.21, 0.53, 5, 10]} />
        <meshStandardMaterial color={shirts[index % shirts.length]} roughness={0.68} />
      </mesh>
      {[-0.115, 0.115].map((legX) => (
        <mesh castShadow key={legX} position={[legX, 0.48, 0]}>
          <capsuleGeometry args={[0.07, 0.64, 4, 8]} />
          <meshStandardMaterial color="#303640" />
        </mesh>
      ))}
    </group>
  );
}

export function OccupancyFigures({ occupancy }) {
  const representation = occupancyRepresentation(occupancy);
  return Array.from({ length: representation.visible }, (_, index) => (
    <Figure key={index} index={index} />
  ));
}
