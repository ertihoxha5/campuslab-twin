import assert from "node:assert/strict";
import { test } from "node:test";

import { permissions } from "../src/authorization/permissions.js";
import { createMaintenanceRepository } from "../src/modules/maintenance/repository.js";
import { createMaintenanceService } from "../src/modules/maintenance/service.js";

test("maintenance list is tenant scoped and technicians see only assigned work", async () => {
  const calls = [];
  const service = createMaintenanceService({
    repository: {
      async list(input) {
        calls.push(input);
        return { items: [{ id: "31" }], total: 1 };
      },
    },
  });

  const result = await service.list(
    { laboratoryId: "15", status: "planned", pageSize: "12" },
    {
      universityId: "7",
      userId: "9",
      roles: ["technician"],
      permissions: [permissions.MAINTENANCE_ASSIGNED],
    },
  );

  assert.equal(result.pagination.total, 1);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].restrictToAssignments, true);
  assert.equal(calls[0].restrictToAssignedWork, true);
  assert.equal(calls[0].limit, 12);
});

test("maintenance managers can create normalized tenant-owned tasks", async () => {
  const calls = [];
  const service = createMaintenanceService({
    repository: {
      async create(input) {
        calls.push(input);
        return { id: "31", ...input.task, status: "planned" };
      },
    },
  });

  const task = await service.create(
    {
      universityId: "999",
      laboratoryId: "15",
      equipmentId: "21",
      assignedUserId: "9",
      type: "preventive",
      priority: "high",
      title: "  Kontrolli periodik  ",
      checklist: [{ label: "  Kontrollo filtrin  " }],
      scheduledAt: "2026-08-10T08:00:00.000Z",
      dueAt: "2026-08-10T10:00:00.000Z",
    },
    {
      universityId: "7",
      userId: "5",
      roles: ["university_admin"],
      permissions: [
        permissions.MAINTENANCE_MANAGE,
        permissions.MAINTENANCE_ASSIGNED,
      ],
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(task.title, "Kontrolli periodik");
  assert.equal(task.checklist[0].label, "Kontrollo filtrin");
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].restrictToAssignments, false);
  assert.equal(calls[0].restrictToAssignedWork, false);
  assert.equal(calls[0].task.universityId, undefined);
});

test("maintenance creation rejects invalid ownership relations and date order", async () => {
  const context = {
    universityId: "7",
    userId: "5",
    roles: ["university_admin"],
    permissions: [permissions.MAINTENANCE_MANAGE],
  };
  const input = {
    laboratoryId: "15",
    equipmentId: "21",
    type: "inspection",
    title: "Inspektimi teknik",
  };

  for (const invalidResult of [
    { invalidLaboratory: true },
    { invalidEquipment: true },
    { invalidAssignee: true },
  ]) {
    const service = createMaintenanceService({
      repository: { async create() { return invalidResult; } },
    });
    await assert.rejects(service.create(input, context), (error) => error.status === 422);
  }

  const service = createMaintenanceService({ repository: { create() {} } });
  await assert.rejects(
    service.create(
      {
        ...input,
        scheduledAt: "2026-08-10T10:00:00.000Z",
        dueAt: "2026-08-10T08:00:00.000Z",
      },
      context,
    ),
    (error) => error.status === 422 && Boolean(error.details?.dueAt),
  );
});

test("maintenance repository scopes list queries to tenant, laboratory assignment, and assignee", async () => {
  const calls = [];
  const repository = createMaintenanceRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 31, title: "Kontrolli periodik" }]];
    },
  });

  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    restrictToAssignedWork: true,
    laboratoryId: "15",
    status: "planned",
    search: "Kontrolli",
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  for (const call of calls) {
    assert.match(call.sql, /task\.university_id = \?/);
    assert.match(call.sql, /assignment\.user_id = \?/);
    assert.match(call.sql, /task\.assigned_user_id = \?/);
    assert.equal(call.parameters[0], "7");
  }
});

test("maintenance task, initial history, and audit are created atomically", async () => {
  const events = [];
  const calls = [];
  const connection = {
    async beginTransaction() { events.push("begin"); },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); },
    release() { events.push("release"); },
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT laboratory.id")) return [[{ id: 15 }]];
      if (sql.includes("SELECT id FROM equipment")) return [[{ id: 21 }]];
      if (sql.includes("SELECT user.id")) return [[{ id: 9 }]];
      if (sql.includes("INSERT INTO maintenance_tasks")) return [{ insertId: 31 }];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createMaintenanceRepository({
    async getConnection() { return connection; },
  });

  const task = await repository.create({
    universityId: "7",
    userId: "5",
    restrictToAssignments: false,
    ipAddress: "127.0.0.1",
    task: {
      laboratoryId: "15",
      equipmentId: "21",
      assignedUserId: "9",
      type: "preventive",
      priority: "high",
      title: "Kontrolli periodik",
      description: null,
      checklist: [{ label: "Kontrollo filtrin", completed: false }],
      scheduledAt: null,
      dueAt: null,
      notes: null,
    },
  });

  assert.equal(task.id, "31");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO maintenance_tasks")));
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO maintenance_updates")));
  assert.ok(calls.some(({ sql }) => sql.includes("'maintenance.created'")));
  assert.ok(
    calls
      .filter(({ sql }) => sql.includes("SELECT"))
      .every(({ parameters }) => parameters.includes("7")),
  );
});

test("maintenance detail includes immutable chronological history", async () => {
  const calls = [];
  const service = createMaintenanceService({
    repository: {
      async findById(input) {
        calls.push({ operation: "detail", input });
        return { id: "31", status: "planned", checklist: [] };
      },
      async history(input) {
        calls.push({ operation: "history", input });
        return [{ id: "41", status: "planned" }];
      },
    },
  });

  const task = await service.detail("31", {
    universityId: "7",
    userId: "9",
    roles: ["technician"],
    permissions: [permissions.MAINTENANCE_ASSIGNED],
  });

  assert.equal(task.history.length, 1);
  assert.equal(calls[0].input.universityId, "7");
  assert.equal(calls[0].input.restrictToAssignedWork, true);
  assert.deepEqual(calls[1].input, { universityId: "7", taskId: "31" });
});

test("maintenance completion requires checklist and corrective repair details", async () => {
  const context = {
    universityId: "7",
    userId: "9",
    roles: ["technician"],
    permissions: [permissions.MAINTENANCE_ASSIGNED],
  };
  const service = createMaintenanceService({
    repository: {
      async findById() {
        return {
          id: "31",
          status: "in_progress",
          type: "corrective",
          checklist: [{ label: "Testo pajisjen", completed: false }],
        };
      },
      async transition() {
        throw new Error("should not transition");
      },
    },
  });

  await assert.rejects(
    service.transition(
      "31",
      { status: "completed", notes: "U testua pajisja." },
      context,
    ),
    (error) => error.status === 422,
  );
  await assert.rejects(
    service.transition(
      "31",
      {
        status: "completed",
        notes: "U testua pajisja.",
        checklist: [{ label: "Testo pajisjen", completed: true }],
      },
      context,
    ),
    (error) => error.status === 422,
  );
});

test("maintenance transition updates task, history, equipment health, and audit atomically", async () => {
  const events = [];
  const calls = [];
  const connection = {
    async beginTransaction() { events.push("begin"); },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); },
    release() { events.push("release"); },
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("LIMIT 1 FOR UPDATE")) {
        return [[{
          id: 31,
          laboratoryId: 15,
          equipmentId: 21,
          type: "corrective",
          title: "Riparimi i robotit",
          status: "in_progress",
        }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createMaintenanceRepository({
    async getConnection() { return connection; },
  });

  const task = await repository.transition({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    restrictToAssignedWork: true,
    taskId: "31",
    ipAddress: "127.0.0.1",
    update: {
      status: "completed",
      notes: "Motori u zëvendësua dhe u testua.",
      checklist: [{ label: "Testo motorin", completed: true }],
      repairDetails: "U zëvendësua motori.",
      cost: 125,
    },
  });

  assert.equal(task.status, "completed");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("UPDATE maintenance_tasks")));
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO maintenance_updates")));
  assert.ok(calls.some(({ sql }) => sql.includes("UPDATE equipment")));
  assert.ok(calls.some(({ sql }) => sql.includes("GREATEST(health_score, 90)")));
  assert.ok(calls.some(({ sql }) => sql.includes("'maintenance.status_changed'")));
});
