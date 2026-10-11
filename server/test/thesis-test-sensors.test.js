import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateSensorReading } from "../src/modules/alerts/rule-engine.js";
import { seedThesisSensors } from "../scripts/seed-thesis-sensors.js";
import { runThesisTests } from "../scripts/run-thesis-tests.js";
import { thesisTestSensors } from "../seeds/thesis-test-sensors.js";

const sensorByType = Object.fromEntries(
  thesisTestSensors.map((sensor) => [sensor.sensorType, sensor]),
);

function severity(type, value) {
  return evaluateSensorReading(
    { ...sensorByType[type], id: type },
    { value },
  )?.severity ?? "normal";
}

test("Chapter 6 fixture classifies the six planned sensor values", () => {
  assert.deepEqual(
    [
      severity("temperature", 23),
      severity("humidity", 45),
      severity("occupancy", 10),
      severity("power", 2000),
    ],
    ["normal", "normal", "normal", "normal"],
  );
  assert.equal(severity("temperature", 29), "warning");
  assert.equal(severity("humidity", 70), "warning");
  assert.equal(severity("occupancy", 30), "critical");
  assert.equal(severity("power", 7000), "critical");
});

test("Chapter 6 fixture handles low-side limits and strict boundaries", () => {
  assert.equal(severity("temperature", 18), "normal");
  assert.equal(severity("temperature", 17), "warning");
  assert.equal(severity("temperature", 14), "critical");
  assert.equal(severity("humidity", 30), "normal");
  assert.equal(severity("humidity", 29), "warning");
  assert.equal(severity("humidity", 19), "critical");
  assert.equal(severity("occupancy", 25), "normal");
  assert.equal(severity("occupancy", 29), "warning");
  assert.equal(severity("power", 5000), "normal");
  assert.equal(severity("power", 6000), "warning");
});

test("thesis sensor installer previews without writes and requires capacity 25", async () => {
  const calls = [];
  const pool = {
    execute: async (sql, parameters) => {
      calls.push({ sql, parameters });
      return [[{ id: 7, universityId: 3, name: "Test", capacity: 25 }]];
    },
  };
  const preview = await seedThesisSensors(pool, { laboratoryCode: "TEST-01" });
  assert.equal(preview.applied, false);
  assert.equal(preview.sensors.length, 4);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].parameters, ["TEST-01"]);

  pool.execute = async () => [[{ id: 7, universityId: 3, capacity: 18 }]];
  await assert.rejects(
    seedThesisSensors(pool, { laboratoryCode: "TEST-01", apply: true }),
    /kërkon 25 persona/,
  );
});

test("fixed-reading runner persists six results atomically with imported readings", async () => {
  const calls = [];
  let nextId = 100;
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql, parameters) => {
      calls.push({ sql, parameters });
      if (sql.includes("FROM laboratories WHERE code")) return [[{ id: 7, universityId: 3, name: "Test", capacity: 25 }]];
      if (sql.includes("FROM sensors WHERE university_id")) {
        return [thesisTestSensors.map((sensor, index) => ({ ...sensor, id: index + 1, status: "online" }))];
      }
      if (sql.includes("FROM simulation_runs") || sql.includes("FROM activity_logs") || sql.includes("FROM alerts") || sql.includes("FROM equipment")) return [[]];
      if (sql.includes("SELECT DISTINCT user_account.id")) return [[{ id: 9 }]];
      nextId += 1;
      return [{ insertId: nextId, affectedRows: 1 }];
    },
  };
  const result = await runThesisTests(
    { getConnection: async () => connection },
    { laboratoryCode: "LAB-25", createTestEquipment: true, apply: true },
  );
  assert.equal(result.applied, true);
  assert.deepEqual(result.results.map((item) => item.actual),
    ["Normal", "Warning", "Warning", "Critical", "Critical", "Problem state only"]);
  assert.equal(calls.filter((call) => call.sql?.includes("INSERT INTO sensor_readings")).length, 8);
  assert.equal(calls.filter((call) => call.sql?.includes("INSERT INTO alerts")).length, 4);
  assert.equal(calls.filter((call) => call.sql?.includes("INSERT INTO notifications")).length, 4);
  assert.equal(calls.filter((call) => call.sql?.includes("SET status = 'fault'")).length, 1);
  assert.deepEqual(calls.filter((call) => typeof call === "string"), ["begin", "commit", "release"]);
});
