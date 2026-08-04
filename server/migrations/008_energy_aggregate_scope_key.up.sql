ALTER TABLE energy_reading_aggregates
  DROP INDEX uq_energy_aggregates_bucket,
  ADD COLUMN equipment_scope_id BIGINT UNSIGNED AS (COALESCE(equipment_id, 0)) STORED,
  ADD UNIQUE KEY uq_energy_aggregates_bucket (
    university_id, laboratory_id, equipment_scope_id,
    bucket_start, interval_minutes, source
  );
