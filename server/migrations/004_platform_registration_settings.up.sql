SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE platform_registration_settings (
  id TINYINT UNSIGNED NOT NULL,
  registrations_open BOOLEAN NOT NULL DEFAULT TRUE,
  require_website_domain_match BOOLEAN NOT NULL DEFAULT TRUE,
  allow_public_email_providers BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_platform_admin_id BIGINT UNSIGNED NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT chk_platform_registration_settings_singleton CHECK (id = 1),
  CONSTRAINT fk_platform_registration_settings_admin
    FOREIGN KEY (updated_by_platform_admin_id) REFERENCES platform_admins (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE institutional_email_exceptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email_domain VARCHAR(190) NOT NULL,
  website_domain VARCHAR(190) NULL,
  reason VARCHAR(500) NOT NULL,
  created_by_platform_admin_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_institutional_email_exception
    (email_domain, website_domain),
  KEY idx_email_exceptions_email_domain (email_domain),
  CONSTRAINT fk_email_exceptions_admin
    FOREIGN KEY (created_by_platform_admin_id) REFERENCES platform_admins (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO platform_registration_settings (id) VALUES (1);
