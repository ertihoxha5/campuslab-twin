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
  assert.equal(userInserts.length, 10);

  for (const call of userInserts) {
    assert.match(call.parameters[3], /^\$2[aby]\$/);
    assert.notEqual(call.parameters[3], "CampusLab!Test2026");
  }

  const roleAssignments = database.calls.filter(
    (call) =>
      call.type === "execute" && call.sql.includes("INSERT INTO user_roles"),
  );
  assert.equal(roleAssignments.length, 10);
  assert.deepEqual(
    new Set(roleAssignments.map((call) => call.parameters[2])),
    new Set([1, 2, 3, 4, 5]),
  );

  const zoneInserts = database.calls.filter(
    (call) =>
      call.type === "execute" &&
      call.sql.includes("INSERT INTO laboratory_zones"),
  );
  assert.equal(zoneInserts.length, 6);
  const showcaseZones = zoneInserts.filter((call) =>
    String(call.parameters[3]).startsWith("UPDT-AUT-01-Z"),
  );
  assert.equal(showcaseZones.length, 4);
  assert.deepEqual(
    showcaseZones.map((call) => call.parameters[4]),
    ["teaching", "research", "preparation", "safety"],
  );
  assert.ok(
    showcaseZones.every((call) => {
      const position = JSON.parse(call.parameters[7]);
      const dimensions = JSON.parse(call.parameters[8]);
      return (
        Number.isFinite(position.x) &&
        dimensions.width > 0 &&
        dimensions.height > 0 &&
        dimensions.depth > 0
      );
    }),
  );

  const equipmentInserts = database.calls.filter(
    (call) =>
      call.type === "execute" && call.sql.includes("INSERT INTO equipment"),
  );
  const sensorInserts = database.calls.filter(
    (call) =>
      call.type === "execute" && call.sql.includes("INSERT INTO sensors"),
  );
  assert.equal(equipmentInserts.length, 6);
  assert.equal(sensorInserts.length, 6);
  assert.deepEqual(
    equipmentInserts.slice(-3).map((call) => call.parameters.at(-1)),
    ["equipment/robot-arm", "equipment/motor-drive", "equipment/safety-panel"],
  );
  assert.deepEqual(
    sensorInserts.slice(-3).map((call) => call.parameters[6]),
    ["equipment_health", "power", "smoke"],
  );
  assert.ok(
    sensorInserts
      .slice(-3)
      .every((call) => call.parameters.slice(-3).every(Number.isFinite)),
  );
  assert.equal(
    database.calls.filter(
      (call) =>
        call.type === "execute" &&
        call.sql.includes("INSERT INTO sensor_readings"),
    ).length,
    18,
  );
  assert.equal(
    database.calls.filter(
      (call) =>
        call.type === "execute" &&
        call.sql.includes("INSERT INTO energy_readings"),
    ).length,
    6,
  );

  const requiredTenantInserts = [
    ["alerts", 3],
    ["maintenance_tasks", 3],
    ["maintenance_updates", 3],
    ["simulation_scenarios", 3],
    ["simulation_runs", 3],
    ["reports", 3],
    ["notifications", 3],
    ["activity_logs", 3],
  ];

  for (const [table, expectedCount] of requiredTenantInserts) {
    assert.equal(
      database.calls.filter(
        (call) =>
          call.type === "execute" && call.sql.includes(`INSERT INTO ${table}`),
      ).length,
      expectedCount,
      `Seed-i duhet të krijojë ${expectedCount} rreshta në ${table}.`,
    );
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
