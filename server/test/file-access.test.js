import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { createFileRepository } from "../src/modules/files/repository.js";
import { createFileService } from "../src/modules/files/service.js";

let temporaryDirectory;
let uploadsDirectory;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "clt-files-"));
  uploadsDirectory = path.join(temporaryDirectory, "uploads");
  await fs.mkdir(path.join(uploadsDirectory, "universities", "7"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(uploadsDirectory, "universities", "7", "report.txt"),
    "tenant 7",
  );
});

after(async () => {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

test("file repository always scopes lookup by university", async () => {
  const calls = [];
  const repository = createFileRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 41 }]];
    },
  });

  await repository.findById({ universityId: "7", fileId: "41" });

  assert.match(calls[0].sql, /WHERE university_id = \? AND id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "41"]);
});

test("file service returns only a tenant-owned file inside uploads", async () => {
  const service = createFileService({
    baseDirectory: temporaryDirectory,
    uploadsDirectory,
    repository: {
      async findById({ universityId, fileId }) {
        assert.deepEqual(
          { universityId, fileId },
          { universityId: "7", fileId: "41" },
        );
        return {
          id: "41",
          originalName: "raport.txt",
          relativePath: "uploads/universities/7/report.txt",
          mimeType: "text/plain",
        };
      },
    },
  });

  const result = await service.getDownload({
    universityId: "7",
    fileId: "41",
  });

  assert.equal(await fs.readFile(result.absolutePath, "utf8"), "tenant 7");
});

test("cross-tenant and path traversal file lookups both return 404", async () => {
  const missingService = createFileService({
    baseDirectory: temporaryDirectory,
    uploadsDirectory,
    repository: {
      async findById() {
        return null;
      },
    },
  });
  const traversalService = createFileService({
    baseDirectory: temporaryDirectory,
    uploadsDirectory,
    repository: {
      async findById() {
        return { relativePath: "../secret.txt" };
      },
    },
  });

  await assert.rejects(
    missingService.getDownload({ universityId: "8", fileId: "41" }),
    (error) => error.status === 404 && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    traversalService.getDownload({ universityId: "7", fileId: "42" }),
    (error) => error.status === 404 && error.code === "NOT_FOUND",
  );
});
