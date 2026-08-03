CREATE TABLE alert_status_updates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  alert_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('new', 'acknowledged', 'in_progress', 'resolved', 'closed') NOT NULL,
  to_status ENUM('new', 'acknowledged', 'in_progress', 'resolved', 'closed') NOT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_alert_updates_tenant_alert_time
    (university_id, alert_id, created_at),
  CONSTRAINT fk_alert_updates_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alert_updates_alert
    FOREIGN KEY (alert_id, university_id) REFERENCES alerts (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alert_updates_user
    FOREIGN KEY (changed_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_alert_updates_transition CHECK (from_status <> to_status)
) ENGINE=InnoDB;
