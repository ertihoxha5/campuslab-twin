import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { createLaboratoryModelRepository } from "../src/modules/laboratories/model-repository.js";
import { createLaboratoryModelService } from "../src/modules/laboratories/model-service.js";
import { createLaboratoryModelStorage } from "../src/storage/laboratory-model-storage.js";

let temporaryDirectory;
let uploadsDirectory;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "clt-models-"));
  uploadsDirectory = path.join(temporaryDirectory, "uploads");
});

after(async () => {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

const glbBuffer = () => {
  const buffer = Buffer.alloc(12);
  buffer.write("glTF", 0, "ascii");
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(12, 8);
  return buffer;
};

test("valid GLB upload is stored under its university and attached", async () => {
  const calls = [];
  const storage = createLaboratoryModelStorage({ uploadsDirectory });
  const service = createLaboratoryModelService({
    storage,
    repository: {
      async attach(input) {
        calls.push(input);
        return {
          id: "41",
          originalName: input.file.originalName,
          mimeType: input.file.mimeType,
          sizeBytes: input.file.sizeBytes,
        };
      },
    },
  });
  const buffer = glbBuffer();

  const model = await service.upload(
    {
      originalname: "laboratori.glb",
      mimetype: "application/octet-stream",
      size: buffer.length,
      buffer,
    },
    {
      universityId: "7",
      laboratoryId: "15",
      userId: "9",
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(model.mimeType, "model/gltf-binary");
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].laboratoryId, "15");
  assert.match(calls[0].file.relativePath, /universities\/7\/models\/.+\.glb$/);
  assert.equal(
    await fs
      .readFile(
        path.join(
          uploadsDirectory,
          "universities",
          "7",
          "models",
          calls[0].file.storedName,
        ),
        "ascii",
      )
      .then((content) => content.slice(0, 4)),
    "glTF",
  );
});

test("valid laboratory photo is accepted as a virtual preview", async () => {
  const calls = [];
  const storage = createLaboratoryModelStorage({ uploadsDirectory });
  const service = createLaboratoryModelService({
    storage,
    repository: {
      async attach(input) {
        calls.push(input);
        return {
          id: "42",
          originalName: input.file.originalName,
          mimeType: input.file.mimeType,
          sizeBytes: input.file.sizeBytes,
        };
      },
    },
  });
  const buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const model = await service.upload(
    {
      originalname: "laboratori.png",
      mimetype: "image/png",
      size: buffer.length,
      buffer,
    },
    {
      universityId: "7",
      laboratoryId: "15",
      userId: "9",
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(model.mimeType, "image/png");
  assert.equal(calls[0].file.mimeType, "image/png");
  assert.match(calls[0].file.relativePath, /universities\/7\/models\/.+\.png$/);
});

test("invalid and externally linked GLTF models are rejected safely", async () => {
  const service = createLaboratoryModelService({
    storage: {
      async save() {
        throw new Error("Skedari i pavlefshëm nuk duhet të ruhet.");
      },
    },
    repository: {},
  });

  await assert.rejects(
    service.upload(
      {
        originalname: "model.glb",
        size: 4,
        buffer: Buffer.from("fake"),
      },
      { universityId: "7" },
    ),
    (error) => error.status === 422 && error.code === "INVALID_MODEL",
  );

  const externalGltf = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      buffers: [{ uri: "model.bin" }],
    }),
  );
  await assert.rejects(
    service.upload(
      {
        originalname: "model.gltf",
        size: externalGltf.length,
        buffer: externalGltf,
      },
      { universityId: "7" },
    ),
    (error) =>
      error.status === 422 && error.message.includes("vetë-përmbajtshëm"),
  );
});

test("model attachment and audit are atomic and tenant-scoped", async () => {
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
      if (sql.includes("SELECT id, name")) {
        return [[{ id: 15, name: "Laboratori Test" }]];
      }
      if (sql.includes("INSERT INTO stored_files")) {
        return [{ insertId: 41 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createLaboratoryModelRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.attach({
    universityId: "7",
    laboratoryId: "15",
    userId: "9",
    ipAddress: "127.0.0.1",
    file: {
      originalName: "laboratori.glb",
      storedName: "uuid.glb",
      relativePath: "uploads/universities/7/models/uuid.glb",
      mimeType: "model/gltf-binary",
      sizeBytes: 100,
      checksumSha256: "a".repeat(64),
    },
  });

  assert.equal(result.id, "41");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO activity_logs")));
  for (const { sql, parameters } of calls.filter(({ sql }) =>
    /FROM laboratories|UPDATE laboratories/.test(sql),
  )) {
    assert.match(sql, /university_id = \?/);
    assert.ok(parameters.includes("7"));
    assert.ok(parameters.includes("15"));
  }
});

test("current model lookup cannot cross laboratory or university scope", async () => {
  const calls = [];
  const repository = createLaboratoryModelRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 41, originalName: "laboratori.glb" }]];
    },
  });

  await repository.findCurrent({
    universityId: "7",
    laboratoryId: "15",
  });

  assert.match(calls[0].sql, /laboratory\.university_id = \?/);
  assert.match(calls[0].sql, /laboratory\.id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "15"]);
});

test("failed database attachment removes the newly stored model", async () => {
  const removed = [];
  const service = createLaboratoryModelService({
    storage: {
      async save() {
        return {
          storedName: "uuid.glb",
          relativePath: "uploads/universities/7/models/uuid.glb",
          checksumSha256: "a".repeat(64),
        };
      },
      async remove(relativePath) {
        removed.push(relativePath);
      },
    },
    repository: {
      async attach() {
        throw new Error("database failed");
      },
    },
  });
  const buffer = glbBuffer();

  await assert.rejects(
    service.upload(
      {
        originalname: "model.glb",
        size: buffer.length,
        buffer,
      },
      { universityId: "7", laboratoryId: "15", userId: "9" },
    ),
    /database failed/,
  );
  assert.deepEqual(removed, ["uploads/universities/7/models/uuid.glb"]);
});
