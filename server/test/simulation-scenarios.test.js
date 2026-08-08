import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialSimulationState,
  generateSimulationStep,
} from "../src/modules/simulator/generator.js";
import {
  buildScenarioConfiguration,
  scenarioDefinitions,
} from "../src/modules/simulator/scenarios.js";

test("all eight required scenarios produce deterministic configured events", () => {
  assert.deepEqual(Object.keys(scenarioDefinitions), [
    "temperature_rise",
    "ventilation_failure",
    "equipment_failure",
    "sensor_offline",
    "overcapacity",
    "smoke_incident",
    "power_spike",
    "energy_saving",
  ]);

  for (const scenarioType of Object.keys(scenarioDefinitions)) {
    const built = buildScenarioConfiguration({
      scenarioType,
      overrides: { startTick: 2, durationTicks: 2, previewTicks: 4 },
    });
    let state = createInitialSimulationState(built.configuration);
    const events = [];
    for (let tick = 1; tick <= 4; tick += 1) {
      const step = generateSimulationStep({
        seed: 741,
        sensors: [],
        previousState: state,
        configuration: built.configuration,
        recordedAt: new Date(tick * 1000).toISOString(),
      });
      state = step.state;
      events.push(step.event?.type ?? null);
    }
    assert.deepEqual(events, [null, scenarioType, scenarioType, null]);
  }
});

test("scenario overrides are bounded and unknown fields are rejected", () => {
  const invalid = buildScenarioConfiguration({
    scenarioType: "power_spike",
    overrides: { intensity: 99, universityId: "999" },
  });
  assert.ok(invalid.validationError);

  assert.equal(
    buildScenarioConfiguration({ scenarioType: "unknown" }).invalidScenarioType,
    true,
  );
});

test("sensor offline suppresses only the configured sensor during the event", () => {
  const configuration = buildScenarioConfiguration({
    scenarioType: "sensor_offline",
    overrides: {
      targetSensorId: "2",
      startTick: 1,
      durationTicks: 1,
      previewTicks: 1,
    },
  }).configuration;
  const step = generateSimulationStep({
    seed: 741,
    sensors: [
      { id: "1", sensorType: "temperature", unit: "°C" },
      { id: "2", sensorType: "temperature", unit: "°C" },
    ],
    previousState: createInitialSimulationState(configuration),
    configuration,
    recordedAt: "2026-08-08T12:00:00.000Z",
  });

  assert.deepEqual(
    step.readings.map(({ sensorId }) => sensorId),
    ["1"],
  );
});

test("energy-saving intervention lowers power against the same baseline", () => {
  const baseline = { equipmentLoad: 0.8, activeEquipmentWatts: 5000 };
  let stableState = createInitialSimulationState(baseline);
  for (let tick = 1; tick <= 10; tick += 1) {
    stableState = generateSimulationStep({
      seed: 741,
      sensors: [],
      previousState: stableState,
      configuration: baseline,
      recordedAt: new Date(tick * 1000).toISOString(),
    }).state;
  }
  const normal = generateSimulationStep({
    seed: 741,
    sensors: [],
    previousState: stableState,
    configuration: baseline,
    recordedAt: "2026-08-08T12:00:00.000Z",
  });
  const savingConfiguration = buildScenarioConfiguration({
    scenarioType: "energy_saving",
    storedConfiguration: baseline,
    overrides: { startTick: 11, durationTicks: 1, intensity: 1 },
  }).configuration;
  const saving = generateSimulationStep({
    seed: 741,
    sensors: [],
    previousState: stableState,
    configuration: savingConfiguration,
    recordedAt: "2026-08-08T12:00:00.000Z",
  });

  assert.ok(saving.state.values.power < normal.state.values.power);
});
