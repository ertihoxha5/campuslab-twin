ALTER TABLE simulation_runs
  ADD COLUMN configuration_snapshot_json JSON NULL AFTER input_json,
  ADD COLUMN baseline_state_json JSON NULL AFTER configuration_snapshot_json,
  ADD COLUMN outcome_json JSON NULL AFTER result_json,
  ADD COLUMN reset_by_user_id BIGINT UNSIGNED NULL AFTER outcome_json,
  ADD COLUMN reset_at DATETIME(3) NULL AFTER reset_by_user_id,
  ADD CONSTRAINT fk_runs_reset_by
    FOREIGN KEY (reset_by_user_id, university_id)
    REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE simulation_run_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  simulation_run_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type ENUM(
    'previewed', 'started', 'paused', 'resumed', 'reading_generated',
    'incident_started', 'incident_ended', 'alert_generated',
    'completed', 'stopped', 'failed', 'reset'
  ) NOT NULL,
  sequence_number INT UNSIGNED NOT NULL,
  event_data_json JSON NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_simulation_run_events_id_university (id, university_id),
  UNIQUE KEY uq_simulation_run_events_sequence
    (university_id, simulation_run_id, sequence_number),
  KEY idx_simulation_run_events_tenant_time
    (university_id, simulation_run_id, occurred_at),
  CONSTRAINT fk_simulation_run_events_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_simulation_run_events_run
    FOREIGN KEY (simulation_run_id, university_id)
    REFERENCES simulation_runs (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_simulation_run_events_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TRIGGER trg_simulation_run_events_immutable_update
BEFORE UPDATE ON simulation_run_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Kronologjia e simulimit nuk mund të ndryshohet.';

CREATE TRIGGER trg_simulation_run_events_immutable_delete
BEFORE DELETE ON simulation_run_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Kronologjia e simulimit nuk mund të fshihet.';
