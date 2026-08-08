DROP TRIGGER IF EXISTS trg_simulation_run_events_immutable_delete;
DROP TRIGGER IF EXISTS trg_simulation_run_events_immutable_update;

DROP TABLE IF EXISTS simulation_run_events;

ALTER TABLE simulation_runs
  DROP FOREIGN KEY fk_runs_reset_by,
  DROP COLUMN reset_at,
  DROP COLUMN reset_by_user_id,
  DROP COLUMN outcome_json,
  DROP COLUMN baseline_state_json,
  DROP COLUMN configuration_snapshot_json;
