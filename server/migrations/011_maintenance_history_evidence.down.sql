DROP TRIGGER IF EXISTS trg_maintenance_updates_immutable_delete;
DROP TRIGGER IF EXISTS trg_maintenance_updates_immutable_update;

DROP TABLE IF EXISTS maintenance_evidence;

ALTER TABLE stored_files
  DROP INDEX uq_stored_files_id_university;

ALTER TABLE maintenance_updates
  DROP INDEX uq_maintenance_updates_id_university;
