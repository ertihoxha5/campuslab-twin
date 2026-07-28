SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE platform_refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform_admin_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_token_id BIGINT UNSIGNED NULL,
  user_agent VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform_refresh_tokens_hash (token_hash),
  KEY idx_platform_refresh_tokens_admin
    (platform_admin_id, expires_at, revoked_at),
  CONSTRAINT fk_platform_refresh_tokens_admin
    FOREIGN KEY (platform_admin_id) REFERENCES platform_admins (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_platform_refresh_tokens_replacement
    FOREIGN KEY (replaced_by_token_id) REFERENCES platform_refresh_tokens (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE platform_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform_admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  description VARCHAR(500) NOT NULL,
  metadata_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_platform_activity_time (created_at),
  KEY idx_platform_activity_actor (platform_admin_id, created_at),
  KEY idx_platform_activity_entity (entity_type, entity_id, created_at),
  CONSTRAINT fk_platform_activity_admin
    FOREIGN KEY (platform_admin_id) REFERENCES platform_admins (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB;
