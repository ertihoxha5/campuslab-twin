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
  assert.match(calls[0].sql, /rowNumber > \? AND rowNumber <= \?/);
  assert.deepEqual(calls[0].parameters, [
    "pending",
    "%Test%",
    "%Test%",
    "%Test%",
    0,
    20,
  ]);
});

test("approval passes the authenticated platform administrator to the transaction", async () => {
  const calls = [];
  const service = createPlatformRegistrationService({
    repository: {
      async review(input) {
        calls.push(input);
        return { id: "7", status: "approved", universityId: "12" };
      },
    },
  });

  const result = await service.review(
    "7",
    { decision: "approved" },
    { platformAdminId: "3", ipAddress: "127.0.0.1" },
  );

  assert.equal(result.status, "approved");
  assert.deepEqual(calls[0], {
    requestId: "7",
    platformAdminId: "3",
    decision: "approved",
    reason: null,
    ipAddress: "127.0.0.1",
  });
});

test("rejection requires a reason and reviewed requests cannot change again", async () => {
  const service = createPlatformRegistrationService({
    repository: {
      async review() {
        return { alreadyReviewed: true, status: "approved" };
      },
    },
  });

  await assert.rejects(
    service.review(
      "7",
      { decision: "rejected", reason: "" },
      { platformAdminId: "3" },
    ),
    (error) => error.status === 422 && error.code === "VALIDATION_ERROR",
  );
  await assert.rejects(
    service.review("7", { decision: "approved" }, { platformAdminId: "3" }),
    (error) => error.status === 409 && error.code === "ALREADY_REVIEWED",
  );
});

test("approval creates university, first administrator, role, notification and audit atomically", async () => {
  const sqlCalls = [];
  const events = [];
  const connection = {
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
    },
    async rollback() {
      events.push("rollback");
    },
    release() {
      events.push("release");
    },
    async execute(sql, parameters) {
      sqlCalls.push({ sql, parameters });
      if (sql.includes("FROM university_registration_requests")) {
        return [
          [
            {
              id: 7,
              universityName: "Universiteti Testues",
              acronym: "UT",
              institutionType: "private",
              city: "Prishtinë",
              address: "Rruga Test",
              officialWebsite: "https://universiteti.test",
              description: null,
              representativeName: "Arta Test",
              representativeEmail: "arta@universiteti.test",
              representativePhone: null,
              passwordHash: "hash",
              status: "pending",
            },
          ],
        ];
      }
      if (sql.includes("INSERT INTO universities")) return [{ insertId: 12 }];
      if (sql.includes("INSERT INTO users")) return [{ insertId: 30 }];
      if (sql.includes("FROM roles")) return [[{ id: 1 }]];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createPlatformRegistrationRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.review({
    requestId: "7",
    platformAdminId: "3",
    decision: "approved",
    reason: null,
    ipAddress: "127.0.0.1",
  });

  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.equal(result.universityId, "12");
  for (const sqlFragment of [
    "INSERT INTO universities",
    "INSERT INTO users",
    "INSERT INTO user_roles",
    "INSERT INTO notifications",
    "UPDATE university_registration_requests",
    "INSERT INTO platform_activity_logs",
  ]) {
    assert.ok(
      sqlCalls.some(({ sql }) => sql.includes(sqlFragment)),
      sqlFragment,
    );
  }
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
