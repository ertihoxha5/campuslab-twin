ALTER TABLE laboratory_zones
  ADD COLUMN zone_type ENUM(
    'general',
    'teaching',
    'research',
    'preparation',
    'storage',
    'safety'
  ) NOT NULL DEFAULT 'general' AFTER code,
  ADD COLUMN occupancy_limit SMALLINT UNSIGNED NULL AFTER description,
  ADD COLUMN environmental_thresholds_json JSON NULL AFTER dimensions_json,
  ADD CONSTRAINT chk_zones_occupancy_limit
    CHECK (occupancy_limit IS NULL OR occupancy_limit > 0);
