import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationsUrl = new URL("../migrations/", import.meta.url);
const documentationUrl = new URL("../../docs/database.md", import.meta.url);

test("database documentation catalogs every migrated table", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((name) => name.endsWith(".up.sql"))
    .sort();
  const definitions = await Promise.all(
    migrationFiles.map((name) =>
      readFile(new URL(name, migrationsUrl), "utf8"),
    ),
  );
  const tables = definitions.flatMap((sql) =>
    [...sql.matchAll(/CREATE TABLE ([a-z_]+) \(/g)].map((match) => match[1]),
  );

  assert.ok(tables.length > 30);
  for (const table of tables) {
    assert.ok(documentation.includes(`\`${table}\``), table);
  }
});
