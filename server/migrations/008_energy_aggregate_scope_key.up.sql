DROP INDEX uq_energy_aggregates_bucket ON energy_reading_aggregates;

ALTER TABLE energy_reading_aggregates
  ADD equipment_scope_id AS COALESCE(equipment_id, 0) PERSISTED;

CREATE UNIQUE INDEX uq_energy_aggregates_bucket ON energy_reading_aggregates (
  university_id, laboratory_id, equipment_scope_id,
  bucket_start, interval_minutes, source
);
