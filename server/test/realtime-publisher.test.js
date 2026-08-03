import assert from "node:assert/strict";
import { test } from "node:test";
import { createRealtimePublisher } from "../src/realtime/publisher.js";

test("simulation readings publish only to the tenant laboratory room", () => {
  const events = [];
  const publisher = createRealtimePublisher();
  publisher.attach({
    to(room) {
      return {
        emit(eventName, payload) {
          events.push({ room, eventName, payload });
        },
      };
    },
  });

  publisher.publishSimulationStep({
    universityId: "7",
    laboratoryId: "15",
    runId: "51",
    readings: [
      {
        sensorId: "1",
        sensorType: "temperature",
        value: 22.4,
        unit: "°C",
      },
      { sensorId: "2", sensorType: "occupancy", value: 8, unit: "people" },
    ],
    energyReadings: [
      { equipmentId: "21", powerWatts: 1200, energyKwh: 0.01 },
    ],
    recordedAt: "2026-08-03T10:00:00.000Z",
    event: null,
  });

  assert.ok(events.length > 0);
  assert.ok(
    events.every(({ room }) => room === "university:7:laboratory:15"),
  );
  assert.equal(
    events.filter(({ eventName }) => eventName === "sensor:reading").length,
    2,
  );
  assert.equal(
    events.find(({ eventName }) => eventName === "energy:reading").payload
      .source,
    "simulated",
  );
  assert.ok(events.some(({ eventName }) => eventName === "occupancy:updated"));
  assert.ok(events.some(({ eventName }) => eventName === "simulation:updated"));
  assert.ok(events.some(({ eventName }) => eventName === "dashboard:refresh"));
});

test("publisher is safely inactive before Socket.IO is attached", () => {
  const publisher = createRealtimePublisher();

  assert.doesNotThrow(() =>
    publisher.publishSimulationStep({
      universityId: "7",
      laboratoryId: "15",
      runId: "51",
      readings: [],
      energyReadings: [],
      recordedAt: "2026-08-03T10:00:00.000Z",
    }),
  );
});
