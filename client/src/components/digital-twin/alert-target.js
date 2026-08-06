import { equipmentMarkerPosition } from "./equipment-position.js";

export function resolveAlertTarget(alert, sensors, equipment, zones) {
  if (alert.sensorId) {
    const sensor = sensors.find(
      (item) => String(item.id) === String(alert.sensorId),
    );
    if (sensor) {
      return [
        Number(sensor.positionX ?? 0),
        Number(sensor.positionY ?? 0) + 0.25,
        Number(sensor.positionZ ?? 0),
      ];
    }
  }
  if (alert.equipmentId) {
    const index = equipment.findIndex(
      (item) => String(item.id) === String(alert.equipmentId),
    );
    if (index >= 0) return equipmentMarkerPosition(equipment[index], zones, index);
  }
  return [0, 1.4, 0];
}
