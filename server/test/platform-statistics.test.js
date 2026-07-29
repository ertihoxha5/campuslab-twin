import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";
import { createPlatformStatisticsRepository } from "../src/modules/platform-statistics/repository.js";

test("platform statistics repository returns numeric aggregate values", async () => {
  const repository = createPlatformStatisticsRepository({
    async execute(sql) {
      assert.match(sql, /FROM university_registration_requests/);
      assert.match(sql, /FROM universities/);
      assert.match(sql, /FROM users/);
      assert.match(sql, /FROM laboratories/);
      return [
        [
          {
            pendingRegistrations: "3",
            approvedRegistrations: "5",
            rejectedRegistrations: "1",
            activeUniversities: "4",
            suspendedUniversities: "1",
            publicUniversities: "2",
            privateUniversities: "3",
            activeUsers: "18",
            laboratories: "9",
          },
        ],
      ];
    },
  });

  const summary = await repository.summary();
  assert.equal(summary.pendingRegistrations, 3);
  assert.equal(summary.activeUsers, 18);
  assert.ok(Object.values(summary).every(Number.isFinite));
});

let server;
let baseUrl;

before(async () => {
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    platformAuthentication(request, _response, next) {
      request.auth = {
        accountType: "platform_admin",
        permissions:
          request.get("x-test-authorized") === "true"
            ? [permissions.PLATFORM_STATISTICS_VIEW]
            : [],
      };
      next();
    },
    platformStatisticsRepository: {
      async summary() {
        return { activeUniversities: 2, pendingRegistrations: 1 };
      },
    },
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("platform summary requires statistics permission", async () => {
  const forbidden = await fetch(`${baseUrl}/api/platform/statistics/summary`);
  const allowed = await fetch(`${baseUrl}/api/platform/statistics/summary`, {
    headers: { "x-test-authorized": "true" },
  });
  const body = await allowed.json();

  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
  assert.equal(body.data.summary.activeUniversities, 2);
});
