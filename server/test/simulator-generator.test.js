import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialSimulationState,
  generateSimulationStep,
} from "../src/modules/simulator/generator.js";

const sensors = [
  { id: "1", sensorType: "temperature", unit: "°C" },
  { id: "2", sensorType: "humidity", unit: "%" },
  { id: "3", sensorType: "co2", unit: "ppm" },
  { id: "4", sensorType: "occupancy", unit: "persona" },
  { id: "5", sensorType: "smoke", unit: "%" },
  { id: "6", sensorType: "power", unit: "W" },
  { id: "7", sensorType: "voltage", unit: "V" },
  { id: "8", sensorType: "equipment_health", unit: "%" },
];

test("the same seed and configuration reproduce the same reading sequence", () => {
  const first = runSteps({
    seed: 741,
    steps: 25,
    configuration: {
      baselineOccupancy: 12,
      equipmentLoad: 0.7,
      ventilationEfficiency: 0.45,
    },
  });
  const second = runSteps({
    seed: 741,
    steps: 25,
    configuration: {
      baselineOccupancy: 12,
      equipmentLoad: 0.7,
      ventilationEfficiency: 0.45,
    },
  });

  assert.deepEqual(first, second);
  assert.notDeepEqual(
    first,
    runSteps({ seed: 742, steps: 25, configuration: {} }),
  );
  assert.ok(
    first.every(({ readings }) =>
      readings.every((reading) => reading.source === "simulated"),
    ),
  );
});

test("normal values change gradually and remain inside realistic ranges", () => {
  const steps = runSteps({
    seed: 22,
    steps: 40,
    configuration: {
      baselineOccupancy: 18,
      equipmentLoad: 0.8,
      activeEquipmentWatts: 6000,
    },
  });

  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1].state.values;
    const current = steps[index].state.values;
    assert.ok(Math.abs(current.temperature - previous.temperature) <= 0.2501);
    assert.ok(Math.abs(current.co2 - previous.co2) <= 40.0001);
    assert.ok(Math.abs(current.humidity - previous.humidity) <= 0.6001);
    assert.ok(Math.abs(current.occupancy - previous.occupancy) <= 1);
    assert.ok(current.temperature >= 10 && current.temperature <= 45);
    assert.ok(current.co2 >= 350 && current.co2 <= 5000);
    assert.ok(current.equipment_health >= 0 && current.equipment_health <= 100);
  }
});

test("occupancy, equipment load and ventilation influence heat, CO2 and power", () => {
  const empty = lastValues({
    baselineOccupancy: 0,
    equipmentLoad: 0.1,
    ventilationEfficiency: 0.9,
  });
  const occupied = lastValues({
    baselineOccupancy: 24,
    equipmentLoad: 0.85,
    ventilationEfficiency: 0.2,
  });
  const ventilated = lastValues({
    baselineOccupancy: 24,
    equipmentLoad: 0.85,
    ventilationEfficiency: 1,
  });

  assert.ok(occupied.temperature > empty.temperature + 2);
  assert.ok(occupied.co2 > empty.co2 + 300);
  assert.ok(occupied.power > empty.power * 4);
  assert.ok(ventilated.temperature < occupied.temperature);
  assert.ok(ventilated.co2 < occupied.co2);
});

test("degradation affects equipment health and energy consumption", () => {
  const healthy = lastValues(
    {
      initialValues: { equipment_health: 100 },
      degradationPerStep: 0,
      equipmentLoad: 0.8,
      activeEquipmentWatts: 5000,
    },
    80,
  );
  const degraded = lastValues(
    {
      initialValues: { equipment_health: 45 },
      degradationPerStep: 0.08,
      equipmentLoad: 0.8,
      activeEquipmentWatts: 5000,
    },
    80,
  );

  assert.ok(degraded.equipment_health < 45);
  assert.ok(degraded.power > healthy.power);
});

test("configured abnormal incidents cross thresholds gradually", () => {
  const smokeSteps = runSteps({
    seed: 7,
    steps: 8,
    configuration: {
      abnormalEvent: {
        type: "smoke_incident",
        startTick: 2,
        durationTicks: 6,
        intensity: 1,
      },
    },
  });
  const failureSteps = runSteps({
    seed: 7,
    steps: 8,
    configuration: {
      abnormalEvent: {
        type: "equipment_failure",
        startTick: 2,
        durationTicks: 6,
        intensity: 1,
      },
    },
  });

  assert.ok(
    Math.max(...smokeSteps.map((step) => step.state.values.smoke)) >= 10,
  );
  assert.ok(failureSteps.at(-1).state.values.equipment_health <= 92);
  assert.deepEqual(smokeSteps[1].event, {
    type: "smoke_incident",
    tick: 2,
  });
});

function runSteps({ seed, steps, configuration }) {
  let state = createInitialSimulationState(configuration);
  const results = [];
  for (let index = 0; index < steps; index += 1) {
    const result = generateSimulationStep({
      seed,
      sensors,
      previousState: state,
      configuration,
      recordedAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
    });
    state = result.state;
    results.push(result);
  }
  return results;
}

function lastValues(configuration, steps = 120) {
  return runSteps({ seed: 55, steps, configuration }).at(-1).state.values;
}
