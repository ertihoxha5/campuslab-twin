ALTER TABLE alerts
  DROP INDEX uq_alerts_active_dedup,
  DROP COLUMN active_deduplication_key,
  DROP COLUMN last_triggered_at,
  ADD UNIQUE KEY uq_alerts_active_dedup
    (university_id, deduplication_key, status);
