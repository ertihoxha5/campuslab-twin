import assert from "node:assert/strict";
import { test } from "node:test";
import { createAlertRepository } from "../src/modules/alerts/repository.js";
import { createAlertService } from "../src/modules/alerts/service.js";

const context = {
  universityId: "7",
  userId: "9",
  roles: ["technician"],
  ipAddress: "127.0.0.1",
};

test("alert lifecycle accepts only the next status and required notes", async () => {
  const transitions = [];
  const repository = {
    async findById() {
      return { id: "71", laboratoryId: "15", status: "new" };
    },
    async transition(input) {
      transitions.push(input);
      return { id: "71", laboratoryId: "15", status: input.status };
    },
  };
  const service = createAlertService({ repository });

  await assert.rejects(
    () => service.transition("71", { status: "resolved", notes: "U rregullua." }, context),
    (error) => error.status === 409,
  );
  await assert.rejects(
    () => service.transition("71", { status: "acknowledged" }, context),
    (error) => error.status === 422,
  );
  const alert = await service.transition(
    "71",
    { status: "acknowledged", notes: "Po e kontrolloj sensorin." },
    context,
  );

  assert.equal(alert.status, "acknowledged");
  assert.equal(transitions[0].universityId, "7");
  assert.equal(transitions[0].userId, "9");
});

test("alert transition, status history and audit commit atomically", async () => {
  const events = [];
  const calls = [];
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
      calls.push({ sql, parameters });
      if (sql.includes("FROM alerts alert_record")) {
        return [[{
          id: 71,
          laboratoryId: 15,
          sensorId: 4,
          equipmentId: null,
          title: "Prag kritik",
          status: "new",
          severity: "critical",
          source: "simulated",
        }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createAlertRepository({
    async getConnection() {
      return connection;
    },
  });

  const alert = await repository.transition({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    alertId: "71",
    status: "acknowledged",
    notes: "Po e kontrolloj sensorin.",
    ipAddress: "127.0.0.1",
  });

  assert.equal(alert.status, "acknowledged");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO alert_status_updates")));
  assert.ok(calls.some(({ sql }) => sql.includes("alert.status_changed")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("7")));
});
