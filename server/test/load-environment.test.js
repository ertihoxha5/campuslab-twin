import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { loadEnvironmentFile } from "../src/config/load-environment.js";

const originalClientOrigin = process.env.CLIENT_ORIGIN;
const temporaryDirectories = [];

afterEach(() => {
  if (originalClientOrigin === undefined) {
    delete process.env.CLIENT_ORIGIN;
  } else {
    process.env.CLIENT_ORIGIN = originalClientOrigin;
  }

  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("loads .env from the project root independently of the working directory", () => {
  const rootDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "campuslab-env-"),
  );
  temporaryDirectories.push(rootDirectory);
  fs.writeFileSync(
    path.join(rootDirectory, ".env"),
    "CLIENT_ORIGIN=http://localhost:5173\n",
  );
  delete process.env.CLIENT_ORIGIN;

  const result = loadEnvironmentFile({ rootDirectory });

  assert.equal(result.error, undefined);
  assert.equal(process.env.CLIENT_ORIGIN, "http://localhost:5173");
});
