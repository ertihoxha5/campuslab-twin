/* eslint-disable react/no-unknown-property */
import { Grid, RoundedBox } from "@react-three/drei";

const workstationPositions = [
  [-3.8, -1.9],
  [0, -1.9],
  [3.8, -1.9],
  [-3.8, 1.25],
  [0, 1.25],
  [3.8, 1.25],
];

function Room() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[14, 0.12, 9]} />
        <meshStandardMaterial color="#d9d8dc" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[0, 1.8, -4.44]}>
        <boxGeometry args={[14, 3.6, 0.12]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <mesh receiveShadow position={[-6.94, 1.8, 0]}>
        <boxGeometry args={[0.12, 3.6, 9]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <mesh receiveShadow position={[6.94, 1.8, 0]}>
        <boxGeometry args={[0.12, 3.6, 9]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <Grid
        args={[14, 9]}
        cellColor="#b6b2bd"
        cellSize={0.5}
        cellThickness={0.35}
        sectionColor="#58427c"
        sectionSize={2}
        sectionThickness={0.65}
        fadeDistance={24}
        position={[0, 0.01, 0]}
      />
      <RoundedBox args={[1.45, 2.65, 0.14]} radius={0.04} position={[5.25, 1.35, -4.34]}>
        <meshStandardMaterial color="#58427c" roughness={0.45} />
      </RoundedBox>
      {[-3.9, -1.3, 1.3].map((x) => (
        <group key={x} position={[x, 2.15, -4.36]}>
          <mesh>
            <boxGeometry args={[1.8, 1.15, 0.07]} />
            <meshPhysicalMaterial color="#a9d8e8" transmission={0.22} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <boxGeometry args={[0.06, 1.15, 0.03]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Workstation({ position, rotation = 0 }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <RoundedBox castShadow receiveShadow args={[2.55, 0.12, 1.05]} radius={0.06} position={[0, 0.82, 0]}>
        <meshStandardMaterial color="#e8e3d8" roughness={0.62} />
      </RoundedBox>
      {[-1.05, 1.05].map((x) => (
        <mesh castShadow key={x} position={[x, 0.4, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 0.8, 12]} />
          <meshStandardMaterial color="#596170" metalness={0.65} roughness={0.34} />
        </mesh>
      ))}
      <group position={[0, 1.28, -0.1]}>
        <RoundedBox castShadow args={[0.98, 0.62, 0.08]} radius={0.04}>
          <meshStandardMaterial color="#181b20" roughness={0.28} />
        </RoundedBox>
        <mesh position={[0, 0, 0.046]}>
          <planeGeometry args={[0.84, 0.48]} />
          <meshStandardMaterial color="#58427c" emissive="#58427c" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0, -0.43, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 0.28, 12]} />
          <meshStandardMaterial color="#3f4650" metalness={0.65} />
        </mesh>
        <mesh position={[0, -0.58, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.035, 18]} />
          <meshStandardMaterial color="#343a43" metalness={0.5} />
        </mesh>
      </group>
      <RoundedBox castShadow args={[0.68, 0.07, 0.25]} radius={0.025} position={[0, 0.92, 0.3]}>
        <meshStandardMaterial color="#303640" />
      </RoundedBox>
      <group position={[0, 0, 0.92]}>
        <RoundedBox castShadow args={[0.72, 0.72, 0.12]} radius={0.08} position={[0, 0.74, 0]}>
          <meshStandardMaterial color="#343a43" />
        </RoundedBox>
        <RoundedBox castShadow args={[0.72, 0.1, 0.62]} radius={0.05} position={[0, 0.42, -0.26]} rotation={[0.18, 0, 0]}>
          <meshStandardMaterial color="#454d58" />
        </RoundedBox>
        <mesh position={[0, 0.18, -0.18]}>
          <cylinderGeometry args={[0.055, 0.065, 0.42, 12]} />
          <meshStandardMaterial color="#303640" metalness={0.55} />
        </mesh>
        <mesh position={[0, -0.02, -0.18]}>
          <cylinderGeometry args={[0.32, 0.32, 0.06, 5]} />
          <meshStandardMaterial color="#303640" metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function ServerRack() {
  return (
    <group position={[-5.9, 1.05, -3.55]}>
      <RoundedBox castShadow args={[1.25, 2.1, 0.82]} radius={0.06}>
        <meshStandardMaterial color="#242a31" metalness={0.55} roughness={0.34} />
      </RoundedBox>
      {[-0.65, -0.35, -0.05, 0.25, 0.55].map((y, index) => (
        <group key={y} position={[0, y, 0.42]}>
          <mesh>
            <boxGeometry args={[1.05, 0.2, 0.04]} />
            <meshStandardMaterial color="#3c444e" metalness={0.65} />
          </mesh>
          <mesh position={[0.38, 0, 0.025]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color={index === 3 ? "#d8a24a" : "#6c7653"} emissive={index === 3 ? "#d8a24a" : "#6c7653"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SafetyAndClimate() {
  return (
    <group>
      <group position={[4.3, 2.85, -4.22]}>
        <RoundedBox args={[2.2, 0.55, 0.35]} radius={0.12}>
          <meshStandardMaterial color="#e5e7eb" roughness={0.42} />
        </RoundedBox>
        <mesh position={[0, -0.08, 0.19]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[1.75, 0.06, 0.05]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      </group>
      <group position={[6.58, 0.72, -2.75]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.24, 0.72, 18]} />
          <meshStandardMaterial color="#b53e3e" roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.46, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.16, 0.035, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#2f343b" />
        </mesh>
      </group>
      {[-3.8, 0, 3.8].map((x) => (
        <group key={x} position={[x, 3.32, 0]}>
          <mesh>
            <boxGeometry args={[2.1, 0.08, 0.55]} />
            <meshStandardMaterial color="#fafafa" emissive="#ffffff" emissiveIntensity={0.75} />
          </mesh>
          <pointLight intensity={0.55} distance={6} color="#f7f3e8" position={[0, -0.12, 0]} />
        </group>
      ))}
    </group>
  );
}

export function DefaultLaboratoryScene() {
  return (
    <group>
      <Room />
      {workstationPositions.map(([x, z], index) => (
        <Workstation key={`${x}:${z}`} position={[x, z]} rotation={index < 3 ? 0 : Math.PI} />
      ))}
      <ServerRack />
      <SafetyAndClimate />
    </group>
  );
}
