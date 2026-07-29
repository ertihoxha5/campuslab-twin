import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTenantExecutor,
  findTenantResource,
  requireTenantRelation,
  requireTenantResource,
} from "../src/database/tenant-query.js";

function recordingExecutor(rows = []) {
  const calls = [];
  return {
    calls,
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [rows];
    },
  };
}

test("tenant executor requires a server-provided university identifier", () => {
  assert.throws(
    () => createTenantExecutor(recordingExecutor(), undefined),
    /universityId është i detyrueshëm/,
  );
});

test("tenant executor rejects unscoped SQL", async () => {
  const tenant = createTenantExecutor(recordingExecutor(), "7");

  await assert.rejects(
    () => tenant.query("SELECT * FROM laboratories"),
    /saktësisht një \/\* TENANT_SCOPE \*\//,
  );
});

test("tenant executor injects university scope as the first SQL parameter", async () => {
  const executor = recordingExecutor([{ id: 12 }]);
  const tenant = createTenantExecutor(executor, "7");

  const row = await tenant.queryOne(
    `SELECT laboratory.id
     FROM laboratories laboratory
     WHERE /* TENANT_SCOPE:laboratory */
       AND laboratory.status = ?`,
    ["active"],
  );

  assert.deepEqual(row, { id: 12 });
  assert.match(executor.calls[0].sql, /laboratory\.university_id = \?/);
  assert.deepEqual(executor.calls[0].parameters, ["7", "active"]);
});

test("tenant executor rejects parameters placed before the scope marker", async () => {
  const tenant = createTenantExecutor(recordingExecutor(), "7");

  await assert.rejects(
    () =>
      tenant.query(
        "SELECT * FROM laboratories WHERE status = ? AND /* TENANT_SCOPE */",
        ["active"],
      ),
    /duhet të vendoset para parametrave/,
  );
});

test("resource lookup always combines resource id with university id", async () => {
  const executor = recordingExecutor([{ id: 22, name: "Laboratori A" }]);
  const resource = await findTenantResource(executor, {
    universityId: "7",
    table: "laboratories",
    resourceId: "22",
    columns: ["id", "name"],
  });

  assert.equal(resource.name, "Laboratori A");
  assert.match(executor.calls[0].sql, /university_id = \? AND id = \?/);
  assert.deepEqual(executor.calls[0].parameters, ["7", "22"]);
});

test("resource lookup rejects non-tenant tables", async () => {
  await assert.rejects(
    () =>
      findTenantResource(recordingExecutor(), {
        universityId: "7",
        table: "platform_admins",
        resourceId: "3",
      }),
    /nuk është tenant table/,
  );
});

test("inaccessible tenant resources return not found without leaking existence", async () => {
  await assert.rejects(
    () =>
      requireTenantResource(recordingExecutor([]), {
        universityId: "7",
        table: "equipment",
        resourceId: "900",
      }),
    (error) => error.status === 404 && error.code === "NOT_FOUND",
  );
});

test("nested resource ownership checks child, parent, and university together", async () => {
  const executor = recordingExecutor([{ id: 31 }]);

  await requireTenantRelation(executor, {
    universityId: "7",
    parentTable: "laboratories",
    parentId: "22",
    childTable: "equipment",
    childId: "31",
    childParentColumn: "laboratory_id",
  });

  assert.match(
    executor.calls[0].sql,
    /parent\.university_id = child\.university_id/,
  );
  assert.deepEqual(executor.calls[0].parameters, ["7", "31", "22"]);
});
