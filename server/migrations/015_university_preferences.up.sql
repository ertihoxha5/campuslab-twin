CREATE TABLE university_preferences (
  university_id BIGINT UNSIGNED NOT NULL,
  temperature_min_c DECIMAL(6,2) NOT NULL DEFAULT 18.00,
  temperature_max_c DECIMAL(6,2) NOT NULL DEFAULT 28.00,
  humidity_min_percent DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  humidity_max_percent DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  co2_max_ppm INT UNSIGNED NOT NULL DEFAULT 1000,
  smoke_max_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  maintenance_reminder_days SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  notify_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  notify_maintenance BOOLEAN NOT NULL DEFAULT TRUE,
  notify_energy BOOLEAN NOT NULL DEFAULT TRUE,
  notify_simulations BOOLEAN NOT NULL DEFAULT TRUE,
  simulation_duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
  simulation_tick_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (university_id),
  CONSTRAINT chk_preferences_temperature CHECK (temperature_min_c < temperature_max_c),
  CONSTRAINT chk_preferences_humidity CHECK (
    humidity_min_percent >= 0 AND humidity_max_percent <= 100
    AND humidity_min_percent < humidity_max_percent
  ),
  CONSTRAINT chk_preferences_co2 CHECK (co2_max_ppm BETWEEN 300 AND 10000),
  CONSTRAINT chk_preferences_smoke CHECK (smoke_max_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_preferences_reminder CHECK (maintenance_reminder_days <= 365),
  CONSTRAINT chk_preferences_simulation CHECK (
    simulation_duration_minutes BETWEEN 1 AND 1440
    AND simulation_tick_seconds BETWEEN 1 AND 300
  ),
  CONSTRAINT fk_preferences_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_preferences_updated_by
    FOREIGN KEY (updated_by_user_id, university_id)
    REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;
