ALTER TABLE alerts
  DROP INDEX uq_alerts_active_dedup,
  ADD COLUMN last_triggered_at DATETIME(3) NULL AFTER deduplication_key,
  ADD COLUMN active_deduplication_key VARCHAR(190)
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN ('new', 'acknowledged', 'in_progress')
        THEN deduplication_key
        ELSE NULL
      END
    ) STORED AFTER deduplication_key,
  ADD UNIQUE KEY uq_alerts_active_dedup
    (university_id, active_deduplication_key);
