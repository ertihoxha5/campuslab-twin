import assert from "node:assert/strict";
import { test } from "node:test";

import { createEnergyRepository } from "../src/modules/energy/repository.js";
import { createEnergyService } from "../src/modules/energy/service.js";

test("energy service calculates comparison, shares, and normalized traceable totals", async () => {
  const calls = [];
  const service = createEnergyService({
    now: () => new Date("2026-08-06T12:00:00.000Z"),
    repository: {
      async getSettings() {
        return { tariffPerKwh: "0.15", currencyCode: "EUR" };
      },
      async overview(input) {
        calls.push(input);
        return {
          current: { powerWatts: "2400", recordedAt: "2026-08-06T11:59:00Z" },
          summary: {
            totalEnergyKwh: "120",
            peakPowerWatts: "3200",
            averagePowerWatts: "1800",
          },
          previous: { totalEnergyKwh: "100" },
          trend: [
            {
              bucketStart: "2026-08-06 11:00:00",
              energyKwh: "5",
              averagePowerWatts: "1900",
              peakPowerWatts: "2600",
            },
          ],
          largestConsumers: [
            {
              equipmentId: 21,
              laboratoryId: 15,
              equipmentName: "Roboti",
              energyKwh: "30",
            },
          ],
          provenance: [
            {
              source: "simulated",
              storageLevel: "raw",
              energyKwh: "120",
              samples: "48",
            },
          ],
        };
      },
    },
  });

  const overview = await service.overview(
    { interval: "hourly", laboratoryId: "15" },
    { universityId: "7", userId: "9", roles: ["lab_manager"] },
  );

  assert.equal(overview.summary.changePercent, 20);
  assert.equal(overview.largestConsumers[0].sharePercent, 25);
  assert.equal(overview.current.powerWatts, 2400);
  assert.equal(overview.provenance[0].samples, 48);
  assert.equal(overview.summary.estimatedCost, 18);
  assert.ok(overview.recommendations.length >= 1);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].restrictToAssignments, true);
  assert.equal(calls[0].startAt.toISOString(), "2026-08-05T12:00:00.000Z");
});

test("energy service supports hourly, daily, weekly, and monthly intervals", async () => {
  const intervals = [];
  const service = createEnergyService({
    now: () => new Date("2026-08-06T12:00:00.000Z"),
    repository: {
      async getSettings() {
        return null;
      },
      async overview(input) {
        intervals.push(input.interval);
        return {
          current: {}, summary: {}, previous: {}, trend: [],
          largestConsumers: [], provenance: [],
        };
      },
    },
  });

  for (const interval of ["hourly", "daily", "weekly", "monthly"]) {
    await service.overview(
      { interval },
      { universityId: "7", userId: "5", roles: ["university_admin"] },
    );
  }
  assert.deepEqual(intervals, ["hourly", "daily", "weekly", "monthly"]);
});

test("energy repository scopes raw and aggregate analytics to tenant access", async () => {
  const calls = [];
  const pool = {
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("AS totalEnergyKwh") && sql.includes("peakPowerWatts")) {
        return [[{ totalEnergyKwh: 10, peakPowerWatts: 20, averagePowerWatts: 15 }]];
      }
      if (sql.includes("AS totalEnergyKwh")) return [[{ totalEnergyKwh: 8 }]];
      if (sql.includes("AS powerWatts")) return [[{ powerWatts: 12 }]];
      return [[]];
    },
  };
  const repository = createEnergyRepository(pool);

  await repository.overview({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    interval: "weekly",
    laboratoryId: "15",
    equipmentId: "21",
    previousStartAt: new Date("2026-01-01T00:00:00Z"),
    startAt: new Date("2026-04-01T00:00:00Z"),
    endAt: new Date("2026-07-01T00:00:00Z"),
  });

  assert.equal(calls.length, 6);
  for (const { sql, parameters } of calls) {
    assert.match(sql, /laboratory\.university_id = \?/);
    assert.match(sql, /assignment\.user_id = \?/);
    assert.ok(parameters.includes("7"));
    assert.ok(parameters.includes("9"));
  }
  assert.ok(calls.some(({ sql }) => sql.includes("FROM energy_readings")));
  assert.ok(
    calls.some(({ sql }) => sql.includes("FROM energy_reading_aggregates")),
  );
  assert.ok(calls.some(({ sql }) => sql.includes("WEEKDAY(point_at)")));
});

test("energy settings normalize currency and audit tariff updates atomically", async () => {
  const events = [];
  const calls = [];
  const connection = {
    async beginTransaction() { events.push("begin"); },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); },
    release() { events.push("release"); },
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createEnergyRepository({
    async getConnection() { return connection; },
  });
  const service = createEnergyService({ repository });

  const settings = await service.updateSettings(
    { tariffPerKwh: "0.185", currencyCode: " eur " },
    { universityId: "7", userId: "5", ipAddress: "127.0.0.1" },
  );

  assert.deepEqual(settings, { tariffPerKwh: 0.185, currencyCode: "EUR" });
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(
    calls.some(({ sql }) => sql.includes("university_energy_settings")),
  );
  assert.ok(calls.some(({ sql }) => sql.includes("'energy.settings_updated'")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("7")));
});
