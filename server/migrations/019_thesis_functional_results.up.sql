CREATE TABLE thesis_functional_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  batch_id CHAR(36) NOT NULL,
  scenario_key VARCHAR(50) NOT NULL,
  scenario_name VARCHAR(120) NOT NULL,
  input_json JSON NOT NULL,
  expected_result VARCHAR(180) NOT NULL,
  actual_result VARCHAR(180) NOT NULL,
  expected_level VARCHAR(40) NOT NULL,
  actual_level VARCHAR(40) NOT NULL,
  status ENUM('PASS', 'FAIL') NOT NULL,
  simulation_run_id BIGINT UNSIGNED NULL,
  alert_id BIGINT UNSIGNED NULL,
  executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_thesis_result_batch_scenario (university_id, batch_id, scenario_key),
  KEY idx_thesis_result_lab_batch (university_id, laboratory_id, id),
  CONSTRAINT fk_thesis_result_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_thesis_result_run
    FOREIGN KEY (simulation_run_id, university_id) REFERENCES simulation_runs (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_thesis_result_alert
    FOREIGN KEY (alert_id, university_id) REFERENCES alerts (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;
