import assert from "node:assert/strict";
import { test } from "node:test";
import { seedDemoData } from "../seeds/demo.js";

function createSeedDatabase({ existingWebsites = [] } = {}) {
  const calls = [];
  let insertId = 100;
  const roleRows = [
    { id: 1, code: "university_admin" },
    { id: 2, code: "lab_manager" },
    { id: 3, code: "technician" },
    { id: 4, code: "academic_staff" },
    { id: 5, code: "observer" },
  ];

  const connection = {
    beginTransaction: async () => calls.push({ type: "begin" }),
    commit: async () => calls.push({ type: "commit" }),
    rollback: async () => calls.push({ type: "rollback" }),
    release: () => calls.push({ type: "release" }),
    execute: async (sql, parameters) => {
      calls.push({ type: "execute", sql, parameters });

      if (sql.includes("SELECT id, code FROM roles")) {
        return [roleRows, []];
      }

      if (sql.includes("SELECT official_website FROM universities")) {
        return [
          existingWebsites.map((officialWebsite) => ({
            official_website: officialWebsite,
          })),
          [],
        ];
      }

      insertId += 1;
      return [{ insertId, affectedRows: 1 }, []];
    },
  };

  return {
    calls,
    pool: { getConnection: async () => connection },
  };
}

test("demo seed creates two distinct tenant datasets with hashed passwords", async () => {
  const database = createSeedDatabase();

  const result = await seedDemoData(database.pool, {
    password: "CampusLab!Test2026",
  });

  assert.equal(result.skipped, false);

  const universityInserts = database.calls.filter(
    (call) =>
      call.type === "execute" &&
      call.sql.includes("INSERT INTO universities ("),
  );
  assert.equal(universityInserts.length, 2);
  assert.notEqual(
    universityInserts[0].parameters[0],
    universityInserts[1].parameters[0],
  );
  assert.notEqual(
    universityInserts[0].parameters[5],
    universityInserts[1].parameters[5],
  );

  const userInserts = database.calls.filter(
    (call) =>
      call.type === "execute" && call.sql.includes("INSERT INTO users ("),
  );
  assert.equal(userInserts.length, 4);

  for (const call of userInserts) {
    assert.match(call.parameters[3], /^\$2[aby]\$/);
    assert.notEqual(call.parameters[3], "CampusLab!Test2026");
  }

  assert.equal(
    database.calls.some(
      (call) => call.type === "execute" && call.sql.includes("?"),
    ),
    true,
  );
  assert.deepEqual(
    database.calls
      .filter((call) => ["begin", "commit", "release"].includes(call.type))
      .map((call) => call.type),
    ["begin", "commit", "release"],
  );
});

test("demo seed is idempotent when both universities already exist", async () => {
  const database = createSeedDatabase({
    existingWebsites: ["https://uni-prishtina.demo", "https://upt.demo"],
  });

  const result = await seedDemoData(database.pool, {
    password: "CampusLab!Test2026",
  });

  assert.equal(result.skipped, true);
  assert.equal(
    database.calls.some(
      (call) =>
        call.type === "execute" &&
        call.sql.includes("INSERT INTO laboratories ("),
    ),
    false,
  );
});
