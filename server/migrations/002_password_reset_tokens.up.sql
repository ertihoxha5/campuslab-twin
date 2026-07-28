SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  requested_ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user
    (university_id, user_id, expires_at, used_at),
  CONSTRAINT fk_password_reset_tokens_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;
