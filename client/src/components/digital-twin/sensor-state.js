export function sensorVisualState(sensor, reading) {
  if (["offline", "inactive"].includes(sensor.status)) return "offline";
  if (sensor.status === "calibration") return "maintenance";
  if (!reading || !Number.isFinite(Number(reading.value))) return "normal";
  const value = Number(reading.value);
  if (
    (sensor.criticalMin != null && value <= Number(sensor.criticalMin)) ||
    (sensor.criticalMax != null && value >= Number(sensor.criticalMax))
  ) {
    return "critical";
  }
  if (
    (sensor.warningMin != null && value <= Number(sensor.warningMin)) ||
    (sensor.warningMax != null && value >= Number(sensor.warningMax))
  ) {
    return "warning";
  }
  return "normal";
}

export const sensorStateColors = {
  normal: "#6c7653",
  warning: "#c58b32",
  critical: "#b53e3e",
  offline: "#6b7280",
  maintenance: "#58427c",
};
