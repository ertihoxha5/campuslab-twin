import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createLaboratoryZoneRepository } from "../src/modules/laboratories/zone-repository.js";
import { createLaboratoryZoneService } from "../src/modules/laboratories/zone-service.js";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("zone configuration migration adds required fields and rollback", () => {
  const up = fs.readFileSync(
    path.join(
      serverDirectory,
      "migrations",
      "005_laboratory_zone_configuration.up.sql",
    ),
    "utf8",
  );
  const down = fs.readFileSync(
    path.join(
      serverDirectory,
      "migrations",
      "005_laboratory_zone_configuration.down.sql",
    ),
    "utf8",
  );

  for (const field of [
    "zone_type",
    "occupancy_limit",
    "environmental_thresholds_json",
  ]) {
    assert.match(up, new RegExp(`ADD COLUMN ${field}`));
    assert.match(down, new RegExp(`DROP COLUMN ${field}`));
  }
});

test("zone list scopes both laboratory and university", async () => {
  const calls = [];
  const repository = createLaboratoryZoneRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 3, name: "Zona A" }]];
    },
  });

  const zones = await repository.list({
    universityId: "7",
    laboratoryId: "15",
  });

  assert.equal(zones.length, 1);
  assert.match(calls[0].sql, /university_id = \?/);
  assert.match(calls[0].sql, /laboratory_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "15"]);
});

test("zone service validates geometry and passes only server tenant context", async () => {
  const calls = [];
  const service = createLaboratoryZoneService({
    repository: {
      async create(input) {
        calls.push(input);
        return { id: "3", ...input.zone };
      },
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    ipAddress: "127.0.0.1",
  };

  const zone = await service.create(
    "15",
    {
      universityId: "999",
      name: "Zona e Mësimit",
      code: "mesim-1",
      zoneType: "teaching",
      occupancyLimit: "24",
      position: { x: "1.5", y: 0, z: -2 },
      dimensions: { width: 8, height: 3, depth: 6 },
      environmentalThresholds: {
        temperature: { min: 18, max: 26 },
        co2: { min: 350, max: 1000 },
      },
    },
    context,
  );

  assert.equal(zone.code, "MESIM-1");
  assert.equal(zone.occupancyLimit, 24);
  assert.equal(zone.position.x, 1.5);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].laboratoryId, "15");
  assert.equal(calls[0].zone.universityId, undefined);

  await assert.rejects(
    service.create(
      "15",
      {
        name: "Zona e Gabuar",
        code: "ZG-1",
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0, height: 3, depth: 4 },
      },
      context,
    ),
    (error) => error.status === 422,
  );
});

test("zone create serializes 3D configuration and audits atomically", async () => {
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
      if (sql.includes("INSERT INTO laboratory_zones")) {
        return [{ insertId: 3 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createLaboratoryZoneRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.create({
    universityId: "7",
    laboratoryId: "15",
    userId: "9",
    ipAddress: "127.0.0.1",
    zone: {
      name: "Zona e Mësimit",
      code: "MESIM-1",
      zoneType: "teaching",
      description: "",
      occupancyLimit: 24,
      position: { x: 1, y: 0, z: 2 },
      dimensions: { width: 8, height: 3, depth: 6 },
      environmentalThresholds: {
        temperature: { min: 18, max: 26 },
      },
    },
  });

  assert.equal(result.id, "3");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.equal(calls[0].parameters[0], "7");
  assert.equal(calls[0].parameters[1], "15");
  assert.equal(calls[0].parameters[7], '{"x":1,"y":0,"z":2}');
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO activity_logs")));
});

test("zone update and delete require the same tenant and laboratory", async () => {
  const calls = [];
  const service = createLaboratoryZoneService({
    repository: {
      async update(input) {
        calls.push(input);
        return { id: input.zoneId, ...input.zone };
      },
      async remove(input) {
        calls.push(input);
        return { id: input.zoneId, name: "Zona A" };
      },
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    ipAddress: "127.0.0.1",
  };
  const input = {
    name: "Zona A",
    code: "ZA-1",
    zoneType: "research",
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 5, height: 3, depth: 5 },
  };

  await service.update("15", "3", input, context);
  await service.remove("15", "3", context);

  for (const call of calls) {
    assert.equal(call.universityId, "7");
    assert.equal(call.laboratoryId, "15");
    assert.equal(call.zoneId, "3");
  }
});

test("zone conflicts return safe Albanian errors", async () => {
  const input = {
    name: "Zona A",
    code: "ZA-1",
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 5, height: 3, depth: 5 },
  };
  const duplicateService = createLaboratoryZoneService({
    repository: {
      async create() {
        const error = new Error("duplicate");
        error.code = "ER_DUP_ENTRY";
        throw error;
      },
    },
  });
  await assert.rejects(
    duplicateService.create("15", input, {
      universityId: "7",
      userId: "9",
    }),
    (error) => error.status === 409 && error.code === "ZONE_CODE_EXISTS",
  );

  const usedService = createLaboratoryZoneService({
    repository: {
      async remove() {
        const error = new Error("referenced");
        error.code = "ER_ROW_IS_REFERENCED_2";
        throw error;
      },
    },
  });
  await assert.rejects(
    usedService.remove("15", "3", { universityId: "7", userId: "9" }),
    (error) => error.status === 409 && error.code === "ZONE_IN_USE",
  );
});
