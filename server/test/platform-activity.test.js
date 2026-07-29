import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";
import { createPlatformActivityRepository } from "../src/modules/platform-activity/repository.js";
import { createPlatformActivityService } from "../src/modules/platform-activity/service.js";

test("activity repository uses parameterized filters and pagination", async () => {
  const calls = [];
  const repository = createPlatformActivityRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return sql.includes("COUNT(*)")
        ? [[{ total: "1" }]]
        : [[{ id: 8, action: "university.suspended" }]];
    },
  });

  const result = await repository.list({
    search: "Admin",
    category: "university",
    limit: 25,
    offset: 25,
  });

  assert.equal(result.total, 1);
  assert.deepEqual(calls[0].parameters, [
    "%Admin%",
    "%Admin%",
    "%Admin%",
    "university.%",
    25,
    50,
  ]);
  assert.doesNotMatch(calls[0].sql, /Admin/);
});

test("activity service validates filters and calculates pagination", async () => {
  const service = createPlatformActivityService({
    repository: {
      async list(input) {
        assert.equal(input.offset, 25);
        return { items: [], total: 51 };
      },
    },
  });
  const result = await service.list({ page: "2", pageSize: "25" });
  assert.equal(result.pagination.pages, 3);
  await assert.rejects(service.list({ category: "private_data" }), {
    code: "VALIDATION_ERROR",
  });
});

let server;
let baseUrl;

before(async () => {
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    platformAuthentication(request, _response, next) {
      request.auth = {
        permissions:
          request.get("x-test-authorized") === "true"
            ? [permissions.PLATFORM_AUDIT_VIEW]
            : [],
      };
      next();
    },
    platformActivityService: {
      async list() {
        return {
          items: [{ id: "1", description: "Veprimi u regjistrua." }],
          pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
        };
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

test("platform activity requires the audit permission", async () => {
  const forbidden = await fetch(`${baseUrl}/api/platform/activity`);
  const allowed = await fetch(`${baseUrl}/api/platform/activity`, {
    headers: { "x-test-authorized": "true" },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
});
