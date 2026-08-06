ALTER TABLE notifications
  DROP FOREIGN KEY fk_notifications_maintenance_task,
  DROP INDEX idx_notifications_tenant_maintenance,
  DROP INDEX uq_notifications_tenant_user_dedup,
  DROP COLUMN deduplication_key,
  DROP COLUMN maintenance_task_id;
