ALTER TABLE maintenance_updates
  ADD UNIQUE KEY uq_maintenance_updates_id_university (id, university_id);

ALTER TABLE stored_files
  ADD UNIQUE KEY uq_stored_files_id_university (id, university_id);

CREATE TABLE maintenance_evidence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  maintenance_task_id BIGINT UNSIGNED NOT NULL,
  maintenance_update_id BIGINT UNSIGNED NULL,
  stored_file_id BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  caption VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_maintenance_evidence_id_university (id, university_id),
  UNIQUE KEY uq_maintenance_evidence_tenant_file (university_id, stored_file_id),
  KEY idx_maintenance_evidence_tenant_task_time
    (university_id, maintenance_task_id, created_at),
  CONSTRAINT fk_maintenance_evidence_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_evidence_task
    FOREIGN KEY (maintenance_task_id, university_id)
    REFERENCES maintenance_tasks (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_evidence_update
    FOREIGN KEY (maintenance_update_id, university_id)
    REFERENCES maintenance_updates (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_evidence_file
    FOREIGN KEY (stored_file_id, university_id)
    REFERENCES stored_files (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_evidence_uploaded_by
    FOREIGN KEY (uploaded_by_user_id, university_id)
    REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TRIGGER trg_maintenance_updates_immutable_update
BEFORE UPDATE ON maintenance_updates
FOR EACH ROW
SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Historiku i mirëmbajtjes nuk mund të ndryshohet.';

CREATE TRIGGER trg_maintenance_updates_immutable_delete
BEFORE DELETE ON maintenance_updates
FOR EACH ROW
SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Historiku i mirëmbajtjes nuk mund të fshihet.';
