import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createNotificationRepository } from "../src/modules/notifications/repository.js";
import { createNotificationService } from "../src/modules/notifications/service.js";

test("notification repository scopes every operation by tenant and user", async () => {
  const calls = [];
  const repository = createNotificationRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: "2" }]];
      if (sql.includes("UPDATE")) return [{ affectedRows: 1 }];
      return [[{ id: 4, title: "Njoftim" }]];
    },
  });

  const result = await repository.listForUser({
    universityId: "8",
    userId: "12",
  });
  const changed = await repository.markRead({
    universityId: "8",
    userId: "12",
    notificationId: "4",
  });

  assert.equal(result.unreadCount, 2);
  assert.equal(changed, true);
  assert.deepEqual(calls[0].parameters.slice(0, 2), ["8", "12"]);
  assert.deepEqual(calls[2].parameters, ["4", "8", "12"]);
  assert.match(calls[2].sql, /university_id = \? AND user_id = \?/);
});

test("notification service hides inaccessible notification existence", async () => {
  const service = createNotificationService({
    repository: {
      async markRead() {
        return false;
      },
    },
  });
  await assert.rejects(
    service.markRead("9", { universityId: "2", userId: "3" }),
    { status: 404, code: "NOT_FOUND" },
  );
});

let server;
let baseUrl;
let receivedContext;

before(async () => {
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    tenantAuthentication(request, _response, next) {
      request.auth = { universityId: "5", userId: "7" };
      next();
    },
    notificationService: {
      async list(context) {
        receivedContext = context;
        return { items: [], unreadCount: 0 };
      },
      async markAllRead() {},
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

test("notification route derives tenant and user from authentication", async () => {
  const response = await fetch(`${baseUrl}/api/notifications`);
  assert.equal(response.status, 200);
  assert.deepEqual(receivedContext, { universityId: "5", userId: "7" });
});
