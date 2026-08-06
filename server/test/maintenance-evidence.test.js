import assert from "node:assert/strict";
import { test } from "node:test";

import { permissions } from "../src/authorization/permissions.js";
import { createMaintenanceEvidenceService } from "../src/modules/maintenance/evidence-service.js";
import { createMaintenanceRepository } from "../src/modules/maintenance/repository.js";

const context = {
  universityId: "7",
  userId: "9",
  roles: ["technician"],
  permissions: [permissions.MAINTENANCE_ASSIGNED],
  ipAddress: "127.0.0.1",
};

test("maintenance evidence accepts safe formats and uses only server tenant context", async () => {
  const calls = [];
  const service = createMaintenanceEvidenceService({
    storage: {
      async save(input) {
        calls.push({ operation: "save", input });
        return {
          storedName: "evidence.jpg",
          relativePath: "uploads/universities/7/maintenance/31/evidence.jpg",
          checksumSha256: "a".repeat(64),
        };
      },
      async remove() {},
    },
    repository: {
      async addEvidence(input) {
        calls.push({ operation: "repository", input });
        return { id: "51", fileId: "61" };
      },
    },
  });

  const result = await service.upload(
    "31",
    {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      originalname: "prova.jpg",
      mimetype: "image/jpeg",
      size: 10,
    },
    { universityId: "999", maintenanceUpdateId: "41", caption: " Pas riparimit " },
    context,
  );

  assert.equal(result.fileId, "61");
  assert.equal(calls[0].input.universityId, "7");
  assert.equal(calls[0].input.taskId, "31");
  assert.equal(calls[1].input.universityId, "7");
  assert.equal(calls[1].input.restrictToAssignedWork, true);
  assert.equal(calls[1].input.evidence.caption, "Pas riparimit");
});

test("maintenance evidence rejects unsafe formats before writing a file", async () => {
  let saved = false;
  const service = createMaintenanceEvidenceService({
    storage: { async save() { saved = true; } },
    repository: {},
  });

  await assert.rejects(
    service.upload(
      "31",
      {
        buffer: Buffer.from("script"),
        originalname: "proof.svg",
        mimetype: "image/svg+xml",
        size: 6,
      },
      {},
      context,
    ),
    (error) => error.status === 422,
  );
  assert.equal(saved, false);
});

test("maintenance evidence removes stored file when task or update is inaccessible", async () => {
  const removed = [];
  const service = createMaintenanceEvidenceService({
    storage: {
      async save() {
        return {
          storedName: "evidence.pdf",
          relativePath: "uploads/evidence.pdf",
          checksumSha256: "b".repeat(64),
        };
      },
      async remove(relativePath) { removed.push(relativePath); },
    },
    repository: { async addEvidence() { return { invalidUpdate: true }; } },
  });

  await assert.rejects(
    service.upload(
      "31",
      {
        buffer: Buffer.from("%PDF-1.7"),
        originalname: "proof.pdf",
        mimetype: "application/pdf",
        size: 3,
      },
      { maintenanceUpdateId: "999" },
      context,
    ),
    (error) => error.status === 404,
  );
  assert.ok(removed.length >= 1);
});

test("evidence metadata, file record, relation, and audit are written atomically", async () => {
  const events = [];
  const calls = [];
  const connection = {
    async beginTransaction() { events.push("begin"); },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); },
    release() { events.push("release"); },
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT task.id")) return [[{ id: 31, title: "Riparimi" }]];
      if (sql.includes("SELECT id FROM maintenance_updates")) return [[{ id: 41 }]];
      if (sql.includes("INSERT INTO stored_files")) return [{ insertId: 61 }];
      if (sql.includes("INSERT INTO maintenance_evidence")) return [{ insertId: 51 }];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createMaintenanceRepository({
    async getConnection() { return connection; },
  });

  const evidence = await repository.addEvidence({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    restrictToAssignedWork: true,
    taskId: "31",
    ipAddress: "127.0.0.1",
    evidence: {
      maintenanceUpdateId: "41",
      caption: "Pas riparimit",
      originalName: "proof.jpg",
      storedName: "stored.jpg",
      relativePath: "uploads/stored.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      checksumSha256: "a".repeat(64),
    },
  });

  assert.equal(evidence.id, "51");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO stored_files")));
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO maintenance_evidence")));
  assert.ok(calls.some(({ sql }) => sql.includes("'maintenance.evidence_added'")));
});
