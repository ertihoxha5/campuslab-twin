import assert from "node:assert/strict";
import { test } from "node:test";
import { createLaboratoryRepository } from "../src/modules/laboratories/repository.js";
import { createEquipmentRepository } from "../src/modules/equipment/repository.js";
import { createSensorRepository } from "../src/modules/sensors/repository.js";
import { createAnalyticsRepository } from "../src/modules/analytics/repository.js";
import { createReportRepository } from "../src/modules/reports/repository.js";
import { createFileRepository } from "../src/modules/files/repository.js";

const tenantId = "7";
const userId = "9";
const injectionProbe = "%' OR 1=1 --";

function recorder() {
  const calls = [];
  return {
    calls,
    executor: {
      async execute(sql, parameters) {
        calls.push({ sql, parameters });
        return [sql.includes("COUNT(*) AS total") ? [{ total: 0 }] : []];
      },
    },
  };
}

const listAndSearchMatrix = [
  {
    surface: "laboratory list and search",
    create: createLaboratoryRepository,
    run: (repository) =>
      repository.list({
        universityId: tenantId,
        userId,
        restrictToAssignments: true,
        search: injectionProbe,
        limit: 20,
        offset: 0,
      }),
    tenantScope: "laboratory.university_id = ?",
    assignmentScope: "assignment.user_id = ?",
  },
  {
    surface: "equipment list and search",
    create: createEquipmentRepository,
    run: (repository) =>
      repository.list({
        universityId: tenantId,
        userId,
        restrictToAssignments: true,
        search: injectionProbe,
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      }),
    tenantScope: "equipment.university_id = ?",
    assignmentScope: "assignment.user_id = ?",
  },
  {
    surface: "sensor list and search",
    create: createSensorRepository,
    run: (repository) =>
      repository.list({
        universityId: tenantId,
        userId,
        restrictToAssignments: true,
        search: injectionProbe,
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      }),
    tenantScope: "sensor.university_id = ?",
    assignmentScope: "assignment.user_id = ?",
  },
];

for (const entry of listAndSearchMatrix) {
  test(`tenant isolation matrix: ${entry.surface}`, async () => {
    const capture = recorder();
    await entry.run(entry.create(capture.executor));
    assert.ok(
      capture.calls.length >= 2,
      "lista dhe numërimi duhet të jenë të ndara",
    );
    for (const call of capture.calls) {
      assert.match(call.sql, new RegExp(entry.tenantScope.replace("?", "\\?")));
      assert.match(
        call.sql,
        new RegExp(entry.assignmentScope.replace("?", "\\?")),
      );
      assert.equal(call.parameters[0], tenantId);
      assert.ok(call.parameters.includes(userId));
      assert.ok(call.parameters.includes(`%${injectionProbe}%`));
      assert.doesNotMatch(call.sql, /OR 1=1 --/);
    }
  });
}

test("tenant isolation matrix: analytics history", async () => {
  const capture = recorder();
  const repository = createAnalyticsRepository(capture.executor);
  await repository.history({
    universityId: tenantId,
    userId,
    restrictToAssignments: true,
    metric: "temperature",
    interval: "daily",
    startAt: new Date("2026-08-01T00:00:00.000Z"),
    endAt: new Date("2026-08-10T00:00:00.000Z"),
    laboratoryId: "15",
  });
  assert.equal(capture.calls.length, 3);
  for (const call of capture.calls) {
    assert.match(call.sql, /reading\.university_id = \?/);
    assert.match(call.sql, /assignment\.user_id = \?/);
    assert.equal(call.parameters[0], tenantId);
    assert.ok(call.parameters.includes(userId));
    assert.ok(call.parameters.includes("15"));
  }
});

test("tenant isolation matrix: report list", async () => {
  const capture = recorder();
  const repository = createReportRepository(capture.executor);
  await repository.list({
    universityId: tenantId,
    userId,
    restrictToAssignments: true,
    page: 1,
    pageSize: 20,
  });
  assert.equal(capture.calls.length, 2);
  for (const call of capture.calls) {
    assert.match(call.sql, /report\.university_id = \?/);
    assert.match(call.sql, /assignment\.user_id = \?/);
    assert.equal(call.parameters[0], tenantId);
    assert.ok(call.parameters.includes(userId));
  }
});

test("tenant isolation matrix: stored file lookup", async () => {
  const capture = recorder();
  const repository = createFileRepository(capture.executor);
  await repository.findById({ universityId: tenantId, fileId: "22" });
  assert.equal(capture.calls.length, 1);
  assert.match(capture.calls[0].sql, /WHERE university_id = \? AND id = \?/);
  assert.deepEqual(capture.calls[0].parameters, [tenantId, "22"]);
});
