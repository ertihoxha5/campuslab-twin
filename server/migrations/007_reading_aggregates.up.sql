CREATE TABLE sensor_reading_aggregates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  sensor_id BIGINT UNSIGNED NOT NULL,
  bucket_start DATETIME(3) NOT NULL,
  interval_minutes SMALLINT UNSIGNED NOT NULL,
  source ENUM('simulated', 'physical', 'imported') NOT NULL,
  minimum_value DECIMAL(16,5) NOT NULL,
  maximum_value DECIMAL(16,5) NOT NULL,
  average_value DECIMAL(16,5) NOT NULL,
  sample_count INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sensor_aggregates_bucket
    (university_id, sensor_id, bucket_start, interval_minutes, source),
  KEY idx_sensor_aggregates_tenant_lab_time
    (university_id, laboratory_id, bucket_start),
  CONSTRAINT fk_sensor_aggregates_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_aggregates_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_aggregates_sensor
    FOREIGN KEY (sensor_id, university_id) REFERENCES sensors (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_sensor_aggregates_interval CHECK (interval_minutes > 0),
  CONSTRAINT chk_sensor_aggregates_samples CHECK (sample_count > 0),
  CONSTRAINT chk_sensor_aggregates_range CHECK (minimum_value <= maximum_value)
) ENGINE=InnoDB;

CREATE TABLE energy_reading_aggregates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NULL,
  bucket_start DATETIME(3) NOT NULL,
  interval_minutes SMALLINT UNSIGNED NOT NULL,
  source ENUM('simulated', 'physical', 'imported') NOT NULL,
  minimum_power_watts DECIMAL(14,4) NOT NULL,
  maximum_power_watts DECIMAL(14,4) NOT NULL,
  average_power_watts DECIMAL(14,4) NOT NULL,
  total_energy_kwh DECIMAL(16,6) NOT NULL,
  sample_count INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_energy_aggregates_bucket
    (university_id, laboratory_id, equipment_id, bucket_start, interval_minutes, source),
  KEY idx_energy_aggregates_tenant_lab_time
    (university_id, laboratory_id, bucket_start),
  CONSTRAINT fk_energy_aggregates_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_energy_aggregates_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_energy_aggregates_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_energy_aggregates_interval CHECK (interval_minutes > 0),
  CONSTRAINT chk_energy_aggregates_samples CHECK (sample_count > 0),
  CONSTRAINT chk_energy_aggregates_values CHECK (
    minimum_power_watts >= 0 AND maximum_power_watts >= minimum_power_watts
    AND total_energy_kwh >= 0
  )
) ENGINE=InnoDB;
