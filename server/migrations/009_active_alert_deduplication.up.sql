ALTER TABLE alerts
  DROP CONSTRAINT uq_alerts_active_dedup;

ALTER TABLE alerts
  ADD last_triggered_at DATETIME2(3) NULL;

ALTER TABLE alerts
  ADD active_deduplication_key AS (
    CASE
      WHEN status IN ('new', 'acknowledged', 'in_progress')
      THEN deduplication_key
      ELSE NULL
    END
  ) PERSISTED;

ALTER TABLE alerts
  ADD CONSTRAINT uq_alerts_active_dedup UNIQUE
    (university_id, active_deduplication_key);
