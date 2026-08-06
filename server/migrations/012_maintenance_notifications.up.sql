ALTER TABLE notifications
  ADD COLUMN maintenance_task_id BIGINT UNSIGNED NULL AFTER alert_id,
  ADD COLUMN deduplication_key VARCHAR(190) NULL AFTER type,
  ADD UNIQUE KEY uq_notifications_tenant_user_dedup
    (university_id, user_id, deduplication_key),
  ADD KEY idx_notifications_tenant_maintenance
    (university_id, maintenance_task_id, created_at),
  ADD CONSTRAINT fk_notifications_maintenance_task
    FOREIGN KEY (maintenance_task_id, university_id)
    REFERENCES maintenance_tasks (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
