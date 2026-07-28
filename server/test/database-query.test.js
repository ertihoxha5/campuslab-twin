import assert from "node:assert/strict";
import { test } from "node:test";
import { query, withTransaction } from "../src/database/query.js";

test("query passes SQL parameters to mysql execute", async () => {
  const executor = {
    execute: async (sql, parameters) => {
      assert.equal(sql, "SELECT * FROM users WHERE university_id = ?");
      assert.deepEqual(parameters, [7]);
      return [[{ id: 1 }], []];
    },
  };

  const rows = await query(
    executor,
    "SELECT * FROM users WHERE university_id = ?",
    [7],
  );

  assert.deepEqual(rows, [{ id: 1 }]);
});

test("withTransaction commits successful operations and releases connection", async () => {
  const events = [];
  const connection = {
    beginTransaction: async () => events.push("begin"),
    commit: async () => events.push("commit"),
    rollback: async () => events.push("rollback"),
    release: () => events.push("release"),
  };
  const pool = { getConnection: async () => connection };

  const result = await withTransaction(pool, async () => {
    events.push("operation");
    return "ok";
  });

  assert.equal(result, "ok");
  assert.deepEqual(events, ["begin", "operation", "commit", "release"]);
});

test("withTransaction rolls back failed operations and releases connection", async () => {
  const events = [];
  const connection = {
    beginTransaction: async () => events.push("begin"),
    commit: async () => events.push("commit"),
    rollback: async () => events.push("rollback"),
    release: () => events.push("release"),
  };
  const pool = { getConnection: async () => connection };

  await assert.rejects(
    withTransaction(pool, async () => {
      events.push("operation");
      throw new Error("failure");
    }),
    /failure/,
  );

  assert.deepEqual(events, ["begin", "operation", "rollback", "release"]);
});
