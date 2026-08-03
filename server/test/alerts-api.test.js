import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createAlertRepository } from "../src/modules/alerts/repository.js";
import { createAlertService } from "../src/modules/alerts/service.js";

test("alert list is filtered, paginated and assignment scoped", async () => {
  const calls = [];
  const repository = createAlertRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 71, severity: "critical" }]];
    },
  });

  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
    status: "new",
    severity: "critical",
    search: "temperaturë",
    limit: 12,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.match(calls[0].sql, /LIMIT 12 OFFSET 0/);
  assert.deepEqual(calls[0].parameters.slice(0, 3), ["7", 1, "9"]);
  assert.ok(calls[0].parameters.includes("critical"));
  assert.ok(calls[0].parameters.includes("%temperaturë%"));
});

test("alert detail cannot be looked up without tenant and assignment scope", async () => {
  const calls = [];
  const repository = createAlertRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 71, title: "Prag kritik" }]];
    },
  });

  await repository.findById({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    alertId: "71",
  });

  assert.match(calls[0].sql, /alert_record\.university_id = \?/);
  assert.match(calls[0].sql, /alert_record\.id = \?/);
  assert.match(calls[0].sql, /assignment\.laboratory_id/);
  assert.deepEqual(calls[0].parameters, ["7", "71", 1, "9"]);
});

test("alert service validates filters and hides inaccessible details", async () => {
  const service = createAlertService({
    repository: {
      async list() {
        return { items: [], total: 0 };
      },
      async findById() {
        return null;
      },
      async history() {
        return [];
      },
    },
  });
  const context = { universityId: "7", userId: "9", roles: ["technician"] };

  await assert.rejects(
    () => service.list({ severity: "danger" }, context),
    (error) => error.status === 422,
  );
  await assert.rejects(
    () => service.detail("71", context),
    (error) => error.status === 404,
  );
});

let server;
let baseUrl;

before(async () => {
  const authenticateTenant = (request, _response, next) => {
    request.auth = {
      universityId: "7",
      userId: "9",
      roles: ["technician"],
      permissions:
        request.headers["x-test-respond"] === "true"
          ? ["alerts.respond"]
          : request.headers["x-test-monitoring"] === "true"
            ? ["monitoring.view"]
            : [],
    };
    next();
  };
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication: authenticateTenant,
      alertService: {
        async list(_input, context) {
          return {
            items: [{ id: "71", universityId: context.universityId }],
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async detail(alertId, context) {
          return { id: alertId, universityId: context.universityId };
        },
        async transition(alertId, input, context) {
          return {
            id: alertId,
            status: input.status,
            universityId: context.universityId,
          };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("alert endpoints require monitoring permission and server tenant context", async () => {
  const forbidden = await fetch(`${baseUrl}/api/alerts`);
  const allowed = await fetch(`${baseUrl}/api/alerts/71`, {
    headers: { "x-test-monitoring": "true" },
  });
  const body = await allowed.json();

  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
  assert.equal(body.data.alert.universityId, "7");
});

test("alert status endpoint requires response permission", async () => {
  const forbidden = await fetch(`${baseUrl}/api/alerts/71/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "acknowledged", notes: "Po kontrollohet." }),
  });
  const allowed = await fetch(`${baseUrl}/api/alerts/71/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-test-respond": "true",
    },
    body: JSON.stringify({ status: "acknowledged", notes: "Po kontrollohet." }),
  });

  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
});
