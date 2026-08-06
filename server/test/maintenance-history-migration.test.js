import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationUrl = new URL(
  "../migrations/011_maintenance_history_evidence.up.sql",
  import.meta.url,
);

test("maintenance evidence is tenant owned and linked to its task, update, file, and user", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE maintenance_evidence/);
  assert.match(sql, /university_id BIGINT UNSIGNED NOT NULL/);
  assert.match(
    sql,
    /FOREIGN KEY \(maintenance_task_id, university_id\)[\s\S]*REFERENCES maintenance_tasks \(id, university_id\)/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \(maintenance_update_id, university_id\)[\s\S]*REFERENCES maintenance_updates \(id, university_id\)/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \(stored_file_id, university_id\)[\s\S]*REFERENCES stored_files \(id, university_id\)/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \(uploaded_by_user_id, university_id\)[\s\S]*REFERENCES users \(id, university_id\)/,
  );
});

test("maintenance history rejects updates and deletes", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /BEFORE UPDATE ON maintenance_updates/);
  assert.match(sql, /BEFORE DELETE ON maintenance_updates/);
  assert.equal((sql.match(/SIGNAL SQLSTATE '45000'/g) ?? []).length, 2);
});

test("maintenance migration rollback removes triggers, evidence, and supporting indexes", async () => {
  const sql = await readFile(
    new URL(
      "../migrations/011_maintenance_history_evidence.down.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS trg_maintenance_updates_immutable_delete/,
  );
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS trg_maintenance_updates_immutable_update/,
  );
  assert.match(sql, /DROP TABLE IF EXISTS maintenance_evidence/);
  assert.match(sql, /DROP INDEX uq_stored_files_id_university/);
  assert.match(sql, /DROP INDEX uq_maintenance_updates_id_university/);
});
