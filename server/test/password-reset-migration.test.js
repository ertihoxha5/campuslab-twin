import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(
  path.resolve(directory, "../migrations/002_password_reset_tokens.up.sql"),
  "utf8",
);

test("password reset migration stores only hashed tenant-owned tokens", () => {
  assert.match(migration, /CREATE TABLE password_reset_tokens/i);
  assert.match(migration, /university_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(migration, /token_hash CHAR\(64\) NOT NULL/i);
  assert.doesNotMatch(migration, /\btoken\s+VARCHAR/i);
  assert.match(migration, /FOREIGN KEY \(user_id, university_id\)/i);
});
