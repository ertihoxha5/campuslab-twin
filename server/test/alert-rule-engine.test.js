import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateSensorReading,
  evaluateSimulationReadings,
} from "../src/modules/alerts/rule-engine.js";

const sensor = {
  id: "4",
  name: "Sensori i temperaturës",
  sensorType: "temperature",
  unit: "°C",
  warningMin: 18,
  warningMax: 27,
  criticalMin: 15,
  criticalMax: 32,
};

test("rule engine prioritizes critical thresholds over warnings", () => {
  const alert = evaluateSensorReading(sensor, { value: 34 });

  assert.equal(alert.severity, "critical");
  assert.equal(alert.threshold, "critical_max");
  assert.equal(alert.deduplicationKey, "sensor:4:threshold");
  assert.match(alert.title, /Prag kritik/);
  assert.match(alert.description, /34 °C/);
});

test("rule engine creates warnings and ignores values inside thresholds", () => {
  assert.equal(evaluateSensorReading(sensor, { value: 22 }), null);
  assert.equal(evaluateSensorReading(sensor, { value: 29 }).severity, "warning");
  assert.equal(evaluateSensorReading(sensor, { value: 16 }).threshold, "warning_min");
});

test("simulation evaluation matches readings to their tenant-loaded sensors", () => {
  const alerts = evaluateSimulationReadings(
    [sensor],
    [
      { sensorId: "4", value: 33 },
      { sensorId: "999", value: 999 },
    ],
  );

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].sensorId, "4");
});
