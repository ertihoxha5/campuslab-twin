ALTER TABLE laboratory_zones
  ADD zone_type varchar(20) NOT NULL CONSTRAINT df_laboratory_zones_zone_type DEFAULT ('general'),
      occupancy_limit smallint NULL,
      environmental_thresholds_json nvarchar(max) NULL;

ALTER TABLE laboratory_zones
  ADD CONSTRAINT chk_zones_occupancy_limit
    CHECK (occupancy_limit IS NULL OR occupancy_limit > 0),
      CONSTRAINT chk_zones_zone_type
    CHECK (zone_type IN ('general', 'teaching', 'research', 'preparation', 'storage', 'safety'));
