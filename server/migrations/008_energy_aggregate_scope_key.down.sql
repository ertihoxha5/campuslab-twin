ALTER TABLE energy_reading_aggregates
  DROP INDEX uq_energy_aggregates_bucket,
  DROP COLUMN equipment_scope_id,
  ADD UNIQUE KEY uq_energy_aggregates_bucket (
    university_id, laboratory_id, equipment_id,
    bucket_start, interval_minutes, source
  );
