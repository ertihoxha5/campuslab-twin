CREATE TABLE sensor_calibrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  sensor_id BIGINT UNSIGNED NOT NULL,
  performed_by_user_id BIGINT UNSIGNED NOT NULL,
  result ENUM('passed', 'adjusted', 'failed') NOT NULL,
  calibrated_at DATETIME(3) NOT NULL,
  calibration_due_at DATETIME(3) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sensor_calibrations_id_university (id, university_id),
  KEY idx_sensor_calibrations_tenant_sensor_time
    (university_id, sensor_id, calibrated_at),
  CONSTRAINT fk_sensor_calibrations_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_calibrations_laboratory
    FOREIGN KEY (laboratory_id, university_id)
    REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_calibrations_sensor
    FOREIGN KEY (sensor_id, university_id) REFERENCES sensors (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_calibrations_user
    FOREIGN KEY (performed_by_user_id, university_id)
    REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_sensor_calibrations_due
    CHECK (calibration_due_at IS NULL OR calibration_due_at > calibrated_at)
) ENGINE=InnoDB;
