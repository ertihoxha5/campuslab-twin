import assert from "node:assert/strict";
import { test } from "node:test";
import { createPlatformUniversityRepository } from "../src/modules/platform-universities/repository.js";
import { createPlatformUniversityService } from "../src/modules/platform-universities/service.js";

test("platform university list validates and calculates pagination", async () => {
  const calls = [];
  const service = createPlatformUniversityService({
    repository: {
      async list(input) {
        calls.push(input);
        return { items: [{ id: "7" }], total: 21 };
      },
    },
  });

  const result = await service.list({
    status: "suspended",
    search: "Test",
    page: "2",
    pageSize: "10",
  });

  assert.deepEqual(calls[0], {
    status: "suspended",
    search: "Test",
    limit: 10,
    offset: 10,
  });
  assert.equal(result.pagination.pages, 3);
});

test("suspension requires a reason and authenticated administrator context", async () => {
  const calls = [];
  const service = createPlatformUniversityService({
    repository: {
      async changeStatus(input) {
        calls.push(input);
        return { id: "7", status: "suspended" };
      },
    },
  });

  await assert.rejects(
    service.changeStatus(
      "7",
      { status: "suspended", reason: "" },
      { platformAdminId: "3" },
    ),
    (error) => error.status === 422,
  );

  await service.changeStatus(
    "7",
    { status: "suspended", reason: "Shkelje e rregullave" },
    { platformAdminId: "3", ipAddress: "127.0.0.1" },
  );
  assert.deepEqual(calls[0], {
    universityId: "7",
    nextStatus: "suspended",
    reason: "Shkelje e rregullave",
    platformAdminId: "3",
    ipAddress: "127.0.0.1",
  });
});

test("invalid university status transitions return conflict", async () => {
  const service = createPlatformUniversityService({
    repository: {
      async changeStatus() {
        return { invalidTransition: true, status: "pending" };
      },
    },
  });

  await assert.rejects(
    service.changeStatus("7", { status: "active" }, { platformAdminId: "3" }),
    (error) =>
      error.status === 409 && error.code === "INVALID_STATUS_TRANSITION",
  );
});

test("suspension updates status, revokes sessions, notifies admins and audits atomically", async () => {
  const events = [];
  const sqlCalls = [];
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
      if (sql.includes("FROM universities")) {
        return [[{ id: 7, name: "Universiteti Testues", status: "active" }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createPlatformUniversityRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.changeStatus({
    universityId: "7",
    nextStatus: "suspended",
    reason: "Shkelje e rregullave",
    platformAdminId: "3",
    ipAddress: "127.0.0.1",
  });

  assert.equal(result.status, "suspended");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  for (const sqlFragment of [
    "UPDATE universities",
    "UPDATE refresh_tokens",
    "INSERT INTO notifications",
    "INSERT INTO platform_activity_logs",
  ]) {
    assert.ok(
      sqlCalls.some(({ sql }) => sql.includes(sqlFragment)),
      sqlFragment,
    );
  }
});
