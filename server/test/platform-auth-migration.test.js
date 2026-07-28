import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(
  path.resolve(directory, "../migrations/003_platform_auth_audit.up.sql"),
  "utf8",
);

test("platform authentication remains separate from tenant-owned sessions", () => {
  assert.match(migration, /CREATE TABLE platform_refresh_tokens/i);
  assert.match(migration, /CREATE TABLE platform_activity_logs/i);
  assert.match(migration, /platform_admin_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(migration, /token_hash CHAR\(64\) NOT NULL/i);
  assert.doesNotMatch(migration, /university_id/i);
});
