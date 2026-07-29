ALTER TABLE laboratory_zones
  DROP CHECK chk_zones_occupancy_limit,
  DROP COLUMN environmental_thresholds_json,
  DROP COLUMN occupancy_limit,
  DROP COLUMN zone_type;
