/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei";
import { resolveAlertTarget } from "./alert-target.js";

export function AlertIndicators({ alerts, sensors, equipment, zones, onFocus }) {
  return alerts.map((alert) => {
    const target = resolveAlertTarget(alert, sensors, equipment, zones);
    const color = alert.severity === "critical" ? "#b53e3e" : "#c58b32";
    return (
      <group key={alert.id} position={[target[0], target[1] + 0.42, target[2]]}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
        </mesh>
        <Html center distanceFactor={10} position={[0, 0.35, 0]}>
          <button
            type="button"
            className={`digital-twin-alert-indicator ${alert.severity}`}
            onClick={() => onFocus(alert)}
            aria-label={`Fokuso alarmin: ${alert.title}`}
          >
            !
          </button>
        </Html>
      </group>
    );
  });
}
