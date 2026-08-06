/* eslint-disable react/no-unknown-property */
import { Instance, Instances } from "@react-three/drei";
import { occupancyRepresentation } from "./occupancy.js";

const shirts = ["#58427c", "#6c7653", "#436f75", "#9c6b30"];

function figureTransform(index) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = -2.4 + column * 1.6 + (row % 2) * 0.28;
  const z = 3.45 - row * 0.72;
  return { x, z, rotationY: index % 2 ? -0.35 : 0.35 };
}

export function OccupancyFigures({ occupancy }) {
  const representation = occupancyRepresentation(occupancy);
  const figures = Array.from(
    { length: representation.visible },
    (_, index) => ({ index, ...figureTransform(index) }),
  );
  if (figures.length === 0) return null;

  return (
    <group>
      <Instances limit={16} range={figures.length} castShadow frustumCulled>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial roughness={0.78} />
        {figures.map((figure) => (
          <Instance
            key={figure.index}
            position={[figure.x, 1.65, figure.z]}
            rotation={[0, figure.rotationY, 0]}
            color={figure.index % 3 ? "#b98262" : "#8f624b"}
          />
        ))}
      </Instances>
      <Instances limit={16} range={figures.length} castShadow frustumCulled>
        <capsuleGeometry args={[0.21, 0.53, 5, 10]} />
        <meshStandardMaterial roughness={0.68} />
        {figures.map((figure) => (
          <Instance
            key={figure.index}
            position={[figure.x, 1.17, figure.z]}
            rotation={[0, figure.rotationY, 0]}
            color={shirts[figure.index % shirts.length]}
          />
        ))}
      </Instances>
      <Instances limit={32} range={figures.length * 2} castShadow frustumCulled>
        <capsuleGeometry args={[0.07, 0.64, 4, 8]} />
        <meshStandardMaterial color="#303640" />
        {figures.flatMap((figure) =>
          [-0.115, 0.115].map((offset) => (
            <Instance
              key={`${figure.index}:${offset}`}
              position={[figure.x + offset, 0.48, figure.z]}
              rotation={[0, figure.rotationY, 0]}
            />
          )),
        )}
      </Instances>
    </group>
  );
}
