CREATE TABLE university_energy_settings (
  university_id BIGINT UNSIGNED NOT NULL,
  tariff_per_kwh DECIMAL(12,4) NOT NULL DEFAULT 0.1200,
  currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (university_id),
  CONSTRAINT chk_energy_settings_tariff CHECK (tariff_per_kwh >= 0),
  CONSTRAINT chk_energy_settings_currency
    CHECK (currency_code REGEXP '^[A-Z]{3}$'),
  CONSTRAINT fk_energy_settings_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_energy_settings_updated_by
    FOREIGN KEY (updated_by_user_id, university_id)
    REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;
