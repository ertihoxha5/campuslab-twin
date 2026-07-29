import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";
import { createDashboardRepository } from "../src/modules/dashboard/repository.js";
import {
  calculateInfrastructureHealth,
  createDashboardService,
} from "../src/modules/dashboard/service.js";

test("dashboard repository scopes aggregates to tenant and assigned laboratories", async () => {
  let captured;
  const repository = createDashboardRepository({
    async execute(sql, parameters) {
      captured = { sql, parameters };
      return [[{ laboratories: "2" }]];
    },
  });

  await repository.summary({
    universityId: "7",
    userId: "19",
    roles: ["technician"],
  });

  assert.match(captured.sql, /user_laboratory_assignments/);
  assert.match(captured.sql, /assignment\.user_id = \?/);
  assert.equal(captured.parameters[0], "7");
  assert.equal(captured.parameters[1], false);
  assert.equal(captured.parameters[2], "19");
  assert.ok(
    captured.parameters
      .filter((value, index) => index > 2)
      .every((value) => value === "7"),
  );
});

test("university administrators receive unrestricted tenant aggregates", async () => {
  let parameters;
  const repository = createDashboardRepository({
    async execute(_sql, values) {
      parameters = values;
      return [[{}]];
    },
  });
  await repository.summary({
    universityId: "4",
    userId: "8",
    roles: ["university_admin"],
  });
  assert.equal(parameters[1], true);
});

test("infrastructure health follows documented deterministic penalties", () => {
  assert.equal(
    calculateInfrastructureHealth({
      averageEquipmentHealth: 90,
      faultEquipment: 1,
      totalEquipment: 10,
      offlineSensors: 2,
      totalSensors: 20,
      criticalAlerts: 1,
    }),
    81,
  );
  assert.equal(
    calculateInfrastructureHealth({
      averageEquipmentHealth: 0,
      faultEquipment: 0,
      totalEquipment: 0,
      offlineSensors: 0,
      totalSensors: 0,
      criticalAlerts: 0,
    }),
    100,
  );
});

test("dashboard service returns numeric metrics and simulation provenance", async () => {
  const service = createDashboardService({
    repository: {
      async summary() {
        return {
          laboratories: "3",
          currentPowerWatts: "1450.5",
          simulatedReadingCount: "4",
          averageEquipmentHealth: "95",
          totalEquipment: "1",
          totalSensors: "1",
        };
      },
    },
    now: () => new Date("2026-07-29T16:00:00.000Z"),
  });
  const result = await service.summary({});
  assert.equal(result.metrics.laboratories, 3);
  assert.equal(result.metrics.currentPowerWatts, 1450.5);
  assert.equal(result.containsSimulatedData, true);
  assert.equal(result.lastUpdatedAt, "2026-07-29T16:00:00.000Z");
});

let server;
let baseUrl;
let receivedContext;

before(async () => {
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    tenantAuthentication(request, _response, next) {
      request.auth = {
        universityId: "5",
        userId: "9",
        roles: ["observer"],
        permissions:
          request.get("x-test-authorized") === "true"
            ? [permissions.MONITORING_VIEW]
            : [],
      };
      next();
    },
    dashboardService: {
      async summary(context) {
        receivedContext = context;
        return { metrics: { laboratories: 1 } };
      },
    },
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("dashboard summary requires monitoring permission and server context", async () => {
  const forbidden = await fetch(`${baseUrl}/api/dashboard/summary`);
  const allowed = await fetch(`${baseUrl}/api/dashboard/summary`, {
    headers: { "x-test-authorized": "true" },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
  assert.deepEqual(receivedContext, {
    universityId: "5",
    userId: "9",
    roles: ["observer"],
  });
});
