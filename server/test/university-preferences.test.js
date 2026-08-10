import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createUniversitySettingsRepository } from "../src/modules/university-settings/repository.js";
import { createUniversitySettingsService } from "../src/modules/university-settings/service.js";

const settings = {
  temperatureMinC: 18,
  temperatureMaxC: 28,
  humidityMinPercent: 30,
  humidityMaxPercent: 70,
  co2MaxPpm: 1000,
  smokeMaxPercent: 1,
  maintenanceReminderDays: 3,
  notifyAlerts: true,
  notifyMaintenance: true,
  notifyEnergy: true,
  notifySimulations: true,
  simulationDurationMinutes: 15,
  simulationTickSeconds: 5,
};

test("preference migration creates tenant settings with constraints and rollback", async () => {
  const up = await readFile(
    new URL("../migrations/015_university_preferences.up.sql", import.meta.url),
    "utf8",
  );
  const down = await readFile(
    new URL(
      "../migrations/015_university_preferences.down.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(up, /CREATE TABLE university_preferences/);
  assert.match(up, /PRIMARY KEY \(university_id\)/);
  assert.match(up, /CHECK \(temperature_min_c < temperature_max_c\)/);
  assert.match(up, /FOREIGN KEY \(updated_by_user_id, university_id\)/);
  assert.match(down, /DROP TABLE IF EXISTS university_preferences/);
});

test("settings service returns defaults and rejects inverted ranges", async () => {
  const service = createUniversitySettingsService({
    repository: {
      async get(universityId) {
        assert.equal(universityId, "7");
        return null;
      },
    },
  });
  const result = await service.get({ universityId: "7" });
  assert.equal(result.co2MaxPpm, 1000);
  await assert.rejects(
    createUniversitySettingsService({ repository: { update() {} } }).update(
      { ...settings, temperatureMinC: 30, temperatureMaxC: 20 },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422,
  );
});

test("preference updates derive tenant context and audit atomically", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {},
    async commit() {
      calls.push({ sql: "COMMIT", parameters: [] });
    },
    async rollback() {},
    release() {},
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT temperature_min_c"))
        return [[{ ...settings, notifyAlerts: 1 }]];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createUniversitySettingsRepository({
    async getConnection() {
      return connection;
    },
  });
  const service = createUniversitySettingsService({ repository });
  const result = await service.update(
    { ...settings, universityId: "999" },
    { universityId: "7", userId: "9", ipAddress: null },
  );
  assert.equal(result.temperatureMinC, 18);
  const upsert = calls.find(({ sql }) =>
    sql.includes("INSERT INTO university_preferences"),
  );
  assert.equal(upsert.parameters[0], "7");
  assert.ok(
    calls.some(({ sql }) => sql.includes("'university.preferences.updated'")),
  );
  assert.ok(calls.some(({ sql }) => sql === "COMMIT"));
});

let server;
let baseUrl;
let captured;
before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        request.auth = {
          universityId: "7",
          userId: "9",
          roles: ["university_admin"],
          permissions: request.headers["x-test-settings"]
            ? ["university.profile.manage"]
            : [],
        };
        next();
      },
      universitySettingsService: {
        async get(context) {
          captured = context;
          return settings;
        },
        async update(_input, context) {
          captured = context;
          return settings;
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("settings endpoints require profile permission and server tenant", async () => {
  assert.equal((await fetch(`${baseUrl}/api/university/settings`)).status, 403);
  const get = await fetch(`${baseUrl}/api/university/settings`, {
    headers: { "x-test-settings": "true" },
  });
  assert.equal(get.status, 200);
  assert.equal(captured.universityId, "7");
  const update = await fetch(`${baseUrl}/api/university/settings`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-test-settings": "true" },
    body: "{}",
  });
  assert.equal(update.status, 200);
  assert.equal(captured.userId, "9");
});
