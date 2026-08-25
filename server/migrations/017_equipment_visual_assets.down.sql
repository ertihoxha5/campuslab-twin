ALTER TABLE digital_twin_assets
  DROP FOREIGN KEY fk_twin_assets_visual_asset,
  DROP INDEX idx_twin_assets_visual_asset,
  DROP COLUMN visible,
  DROP COLUMN scale_z,
  DROP COLUMN scale_y,
  DROP COLUMN scale_x,
  DROP COLUMN visual_asset_id;

DROP TABLE IF EXISTS equipment_visual_assets;

ALTER TABLE stored_files
  MODIFY COLUMN category ENUM('university_logo','model_3d','report','maintenance_evidence') NOT NULL;
