ALTER TABLE stored_files
  MODIFY COLUMN category ENUM('university_logo','model_3d','report','maintenance_evidence','equipment_asset') NOT NULL;

CREATE TABLE equipment_visual_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  stored_file_id BIGINT UNSIGNED NULL,
  asset_kind ENUM('model_3d','image','built_in') NOT NULL,
  built_in_key VARCHAR(80) NULL,
  display_name VARCHAR(160) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipment_visual_assets_id_university (id, university_id),
  UNIQUE KEY uq_equipment_visual_assets_file (stored_file_id),
  KEY idx_equipment_visual_assets_equipment (university_id, equipment_id, is_primary),
  CONSTRAINT chk_equipment_visual_assets_source CHECK (
    (asset_kind = 'built_in' AND built_in_key IS NOT NULL AND stored_file_id IS NULL)
    OR (asset_kind IN ('model_3d','image') AND stored_file_id IS NOT NULL AND built_in_key IS NULL)
  ),
  CONSTRAINT fk_equipment_visual_assets_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_equipment_visual_assets_file
    FOREIGN KEY (stored_file_id, university_id) REFERENCES stored_files (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_equipment_visual_assets_creator
    FOREIGN KEY (created_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE digital_twin_assets
  ADD COLUMN visual_asset_id BIGINT UNSIGNED NULL AFTER parent_equipment_id,
  ADD COLUMN scale_x DECIMAL(9,5) NOT NULL DEFAULT 1 AFTER rotation_z,
  ADD COLUMN scale_y DECIMAL(9,5) NOT NULL DEFAULT 1 AFTER scale_x,
  ADD COLUMN scale_z DECIMAL(9,5) NOT NULL DEFAULT 1 AFTER scale_y,
  ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE AFTER scale_z,
  ADD KEY idx_twin_assets_visual_asset (university_id, visual_asset_id),
  ADD CONSTRAINT fk_twin_assets_visual_asset
    FOREIGN KEY (visual_asset_id, university_id)
    REFERENCES equipment_visual_assets (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
