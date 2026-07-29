import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";
import { createPlatformRegistrationRepository } from "../src/modules/platform-registrations/repository.js";
import { createPlatformRegistrationService } from "../src/modules/platform-registrations/service.js";

test("platform registration list validates filters and calculates pagination", async () => {
  const calls = [];
  const service = createPlatformRegistrationService({
    repository: {
      async list(input) {
        calls.push(input);
        return { items: [{ id: 9 }], total: 41 };
      },
    },
  });

  const result = await service.list({
    status: "pending",
    search: "Universiteti",
    page: "2",
    pageSize: "20",
  });

  assert.deepEqual(calls[0], {
    status: "pending",
    search: "Universiteti",
    limit: 20,
    offset: 20,
  });
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 20,
    total: 41,
    pages: 3,
  });
});

test("platform registration detail returns a safe not-found response", async () => {
  const service = createPlatformRegistrationService({
    repository: {
      async findById() {
        return null;
      },
    },
  });

  await assert.rejects(
    service.findById("900"),
    (error) => error.status === 404 && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    service.findById("invalid"),
    (error) => error.status === 404 && error.code === "NOT_FOUND",
  );
});

test("platform registration repository uses parameterized filters and pagination", async () => {
  const calls = [];
  const repository = createPlatformRegistrationRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 7, status: "pending" }]];
    },
  });

  const result = await repository.list({
    status: "pending",
    search: "Test",
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.match(calls[0].sql, /status = \?/);
  assert.match(calls[0].sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(calls[0].parameters, [
    "pending",
    "%Test%",
    "%Test%",
    "%Test%",
    20,
    0,
  ]);
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
            ? [permissions.PLATFORM_UNIVERSITIES_REVIEW]
            : [],
      };
      next();
    },
    platformRegistrationService: {
      async list(filters) {
        return {
          items: [{ id: "7", status: filters.status }],
          pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
        };
      },
      async findById(id) {
        return { id, universityName: "Universiteti Testues" };
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

test("platform registration endpoints require the review permission", async () => {
  const forbidden = await fetch(
    `${baseUrl}/api/platform/registration-requests`,
  );
  const allowed = await fetch(
    `${baseUrl}/api/platform/registration-requests?status=pending`,
    { headers: { "x-test-authorized": "true" } },
  );
  const body = await allowed.json();

  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
  assert.equal(body.data.registrationRequests[0].status, "pending");
  assert.equal(body.meta.pagination.total, 1);
});
