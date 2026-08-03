const thresholdLabels = {
  critical_min: "minimumin kritik",
  critical_max: "maksimumin kritik",
  warning_min: "minimumin paralajmërues",
  warning_max: "maksimumin paralajmërues",
};

export function evaluateSensorReading(sensor, reading) {
  const value = Number(reading.value);
  if (!Number.isFinite(value)) return null;

  const violation = [
    ["critical_min", sensor.criticalMin, (current, limit) => current < limit],
    ["critical_max", sensor.criticalMax, (current, limit) => current > limit],
    ["warning_min", sensor.warningMin, (current, limit) => current < limit],
    ["warning_max", sensor.warningMax, (current, limit) => current > limit],
  ].find(([, rawLimit, violates]) => {
    const limit = Number(rawLimit);
    return rawLimit != null && Number.isFinite(limit) && violates(value, limit);
  });

  if (!violation) return null;
  const [threshold, rawLimit] = violation;
  const severity = threshold.startsWith("critical") ? "critical" : "warning";
  const sensorName = sensor.name || `Sensori ${sensor.id}`;
  const unit = sensor.unit ? ` ${sensor.unit}` : "";

  return {
    sensorId: String(sensor.id),
    equipmentId: sensor.equipmentId ? String(sensor.equipmentId) : null,
    category: `sensor_${sensor.sensorType}_threshold`,
    severity,
    title:
      severity === "critical"
        ? `Prag kritik: ${sensorName}`
        : `Paralajmërim: ${sensorName}`,
    description: `${sensorName} regjistroi ${value}${unit}, duke kaluar ${
      thresholdLabels[threshold]
    } prej ${Number(rawLimit)}${unit}.`,
    source: "simulated",
    deduplicationKey: `sensor:${sensor.id}:threshold`,
    threshold,
    thresholdValue: Number(rawLimit),
    currentValue: value,
  };
}

export function evaluateSimulationReadings(sensors, readings) {
  const sensorsById = new Map(
    sensors.map((sensor) => [String(sensor.id), sensor]),
  );
  return readings.flatMap((reading) => {
    const sensor = sensorsById.get(String(reading.sensorId));
    if (!sensor) return [];
    const alert = evaluateSensorReading(sensor, reading);
    return alert ? [alert] : [];
  });
}
