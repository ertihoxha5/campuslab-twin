/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";
import { sensorStateColors, sensorVisualState } from "./sensor-state.js";

export function SensorMarkers({ sensors, readings, visible, onSelect }) {
  if (!visible) return null;

  return sensors.map((sensor) => {
    const reading = readings[String(sensor.id)];
    const state = sensorVisualState(sensor, reading);
    const color = sensorStateColors[state];
    const value = reading
      ? `${Number(reading.value).toLocaleString("sq-AL")} ${reading.unit ?? sensor.unit}`
      : "Në pritje të leximit";

    return (
      <group
        key={sensor.id}
        position={[
          Number(sensor.positionX ?? 0),
          Number(sensor.positionY ?? 0) + 0.18,
          Number(sensor.positionZ ?? 0),
        ]}
      >
        <mesh
          castShadow
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(sensor);
          }}
        >
          <sphereGeometry args={[0.13, 18, 14]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={state === "critical" ? 0.8 : 0.35}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.025, 10, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
        <Html center distanceFactor={9} position={[0, 0.42, 0]}>
          <button
            type="button"
            className={`digital-twin-sensor-label ${state}`}
            onClick={() => onSelect?.(sensor)}
          >
            <strong>{sensor.name}</strong>
            <span>{value}</span>
          </button>
        </Html>
      </group>
    );
  });
}
