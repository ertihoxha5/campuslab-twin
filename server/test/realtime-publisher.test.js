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

test("new alerts publish once to the laboratory and recipient user rooms", () => {
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

  publisher.publishAlert({
    universityId: "7",
    laboratoryId: "15",
    recordedAt: "2026-08-03T10:00:00.000Z",
    alert: {
      id: "71",
      created: true,
      sensorId: "4",
      equipmentId: null,
      category: "sensor_temperature_threshold",
      severity: "critical",
      title: "Prag kritik: Temperatura",
      description: "Temperatura kaloi pragun kritik.",
      source: "simulated",
      recipientUserIds: ["9", "10"],
    },
  });

  assert.equal(events[0].room, "university:7:laboratory:15");
  assert.equal(events[0].eventName, "alert:created");
  assert.deepEqual(
    events.slice(1).map(({ room }) => room),
    ["university:7:user:9", "university:7:user:10"],
  );
  assert.ok(events.slice(1).every(({ eventName }) => eventName === "notification:created"));
});

test("existing alerts publish updates without duplicate notifications", () => {
  const events = [];
  const publisher = createRealtimePublisher();
  publisher.attach({
    to(room) {
      return { emit: (eventName) => events.push({ room, eventName }) };
    },
  });

  publisher.publishAlert({
    universityId: "7",
    laboratoryId: "15",
    recordedAt: "2026-08-03T10:01:00.000Z",
    alert: {
      id: "71",
      created: false,
      sensorId: "4",
      severity: "critical",
      title: "Prag kritik",
      description: "Vlera vazhdon jashtë pragut.",
      source: "simulated",
      recipientUserIds: ["9"],
    },
  });

  assert.deepEqual(events, [
    { room: "university:7:laboratory:15", eventName: "alert:updated" },
  ]);
});
