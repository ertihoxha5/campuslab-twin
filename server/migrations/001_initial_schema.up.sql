SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE universities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  acronym VARCHAR(30) NOT NULL,
  institution_type ENUM('public', 'private') NOT NULL,
  status ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  city VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  official_website VARCHAR(255) NOT NULL,
  description TEXT NULL,
  representative_name VARCHAR(160) NOT NULL,
  representative_email VARCHAR(190) NOT NULL,
  logo_file_id BIGINT UNSIGNED NULL,
  rejection_reason TEXT NULL,
  suspension_reason TEXT NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_universities_acronym (acronym),
  UNIQUE KEY uq_universities_website (official_website),
  KEY idx_universities_status (status)
) ENGINE=InnoDB;

CREATE TABLE university_registration_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_name VARCHAR(200) NOT NULL,
  acronym VARCHAR(30) NOT NULL,
  institution_type ENUM('public', 'private') NOT NULL,
  city VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  official_website VARCHAR(255) NOT NULL,
  description TEXT NULL,
  representative_name VARCHAR(160) NOT NULL,
  representative_email VARCHAR(190) NOT NULL,
  representative_phone VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  temporary_logo_path VARCHAR(500) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  review_reason TEXT NULL,
  reviewed_by_platform_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  created_university_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_registration_email_pending (representative_email, status),
  KEY idx_registration_status_created (status, created_at),
  CONSTRAINT fk_registration_university
    FOREIGN KEY (created_university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE platform_admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform_admins_email (email)
) ENGINE=InnoDB;

ALTER TABLE university_registration_requests
  ADD CONSTRAINT fk_registration_reviewer
    FOREIGN KEY (reviewed_by_platform_admin_id) REFERENCES platform_admins (id)
    ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  name_sq VARCHAR(120) NOT NULL,
  description_sq VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  job_title VARCHAR(120) NULL,
  status ENUM('invited', 'active', 'inactive') NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_university_email (university_id, email),
  UNIQUE KEY uq_users_id_university (id, university_id),
  KEY idx_users_university_status (university_id, status, deleted_at),
  CONSTRAINT fk_users_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_assignment (university_id, user_id, role_id),
  KEY idx_user_roles_university_role (university_id, role_id),
  CONSTRAINT fk_user_roles_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_token_id BIGINT UNSIGNED NULL,
  user_agent VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_university_user (university_id, user_id, expires_at),
  CONSTRAINT fk_refresh_tokens_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_replacement
    FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE laboratories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  code VARCHAR(50) NOT NULL,
  faculty VARCHAR(180) NOT NULL,
  building VARCHAR(160) NOT NULL,
  floor VARCHAR(40) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  responsible_user_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive', 'maintenance', 'archived') NOT NULL DEFAULT 'active',
  model_file_id BIGINT UNSIGNED NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_laboratories_university_code (university_id, code),
  UNIQUE KEY uq_laboratories_id_university (id, university_id),
  KEY idx_laboratories_university_status (university_id, status, deleted_at),
  CONSTRAINT chk_laboratories_capacity CHECK (capacity > 0),
  CONSTRAINT fk_laboratories_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_laboratories_responsible_user
    FOREIGN KEY (responsible_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE user_laboratory_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_laboratory_assignment (university_id, user_id, laboratory_id),
  KEY idx_assignments_university_laboratory (university_id, laboratory_id),
  CONSTRAINT fk_assignments_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_assignments_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE laboratory_zones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  position_json JSON NULL,
  dimensions_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_zones_laboratory_code (university_id, laboratory_id, code),
  UNIQUE KEY uq_zones_id_university (id, university_id),
  KEY idx_zones_university_laboratory (university_id, laboratory_id),
  CONSTRAINT fk_zones_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_zones_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE equipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  zone_id BIGINT UNSIGNED NULL,
  responsible_user_id BIGINT UNSIGNED NULL,
  name VARCHAR(180) NOT NULL,
  code VARCHAR(60) NOT NULL,
  type VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(120) NULL,
  model VARCHAR(120) NULL,
  serial_number VARCHAR(120) NULL,
  status ENUM('active', 'inactive', 'fault', 'maintenance', 'archived') NOT NULL DEFAULT 'active',
  purchase_date DATE NULL,
  warranty_expires_at DATE NULL,
  energy_rating_watts DECIMAL(12,3) NULL,
  health_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  object_3d_reference VARCHAR(255) NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipment_university_code (university_id, code),
  UNIQUE KEY uq_equipment_university_serial (university_id, serial_number),
  UNIQUE KEY uq_equipment_id_university (id, university_id),
  KEY idx_equipment_university_lab_status (university_id, laboratory_id, status, deleted_at),
  CONSTRAINT chk_equipment_health CHECK (health_score >= 0 AND health_score <= 100),
  CONSTRAINT chk_equipment_energy CHECK (energy_rating_watts IS NULL OR energy_rating_watts >= 0),
  CONSTRAINT fk_equipment_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_equipment_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_equipment_zone
    FOREIGN KEY (zone_id, university_id) REFERENCES laboratory_zones (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_equipment_responsible_user
    FOREIGN KEY (responsible_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sensors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  zone_id BIGINT UNSIGNED NULL,
  equipment_id BIGINT UNSIGNED NULL,
  name VARCHAR(180) NOT NULL,
  code VARCHAR(60) NOT NULL,
  sensor_type ENUM('temperature', 'humidity', 'co2', 'occupancy', 'smoke', 'power', 'voltage', 'equipment_health') NOT NULL,
  unit VARCHAR(30) NOT NULL,
  status ENUM('online', 'offline', 'calibration', 'inactive', 'archived') NOT NULL DEFAULT 'online',
  sampling_interval_seconds INT UNSIGNED NOT NULL DEFAULT 60,
  warning_min DECIMAL(14,4) NULL,
  warning_max DECIMAL(14,4) NULL,
  critical_min DECIMAL(14,4) NULL,
  critical_max DECIMAL(14,4) NULL,
  calibrated_at DATETIME(3) NULL,
  calibration_due_at DATETIME(3) NULL,
  position_x DECIMAL(10,4) NOT NULL DEFAULT 0,
  position_y DECIMAL(10,4) NOT NULL DEFAULT 0,
  position_z DECIMAL(10,4) NOT NULL DEFAULT 0,
  rotation_x DECIMAL(10,4) NOT NULL DEFAULT 0,
  rotation_y DECIMAL(10,4) NOT NULL DEFAULT 0,
  rotation_z DECIMAL(10,4) NOT NULL DEFAULT 0,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sensors_university_code (university_id, code),
  UNIQUE KEY uq_sensors_id_university (id, university_id),
  KEY idx_sensors_university_lab_status (university_id, laboratory_id, status, deleted_at),
  CONSTRAINT chk_sensors_interval CHECK (sampling_interval_seconds > 0),
  CONSTRAINT fk_sensors_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensors_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensors_zone
    FOREIGN KEY (zone_id, university_id) REFERENCES laboratory_zones (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensors_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sensor_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  sensor_id BIGINT UNSIGNED NOT NULL,
  value DECIMAL(16,5) NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  source ENUM('simulated', 'physical', 'imported') NOT NULL DEFAULT 'simulated',
  simulation_run_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sensor_readings_tenant_sensor_time (university_id, sensor_id, recorded_at),
  KEY idx_sensor_readings_tenant_lab_time (university_id, laboratory_id, recorded_at),
  CONSTRAINT fk_sensor_readings_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_readings_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sensor_readings_sensor
    FOREIGN KEY (sensor_id, university_id) REFERENCES sensors (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE energy_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NULL,
  power_watts DECIMAL(14,4) NOT NULL,
  energy_kwh DECIMAL(14,6) NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  source ENUM('simulated', 'physical', 'imported') NOT NULL DEFAULT 'simulated',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_energy_readings_tenant_lab_time (university_id, laboratory_id, recorded_at),
  KEY idx_energy_readings_tenant_equipment_time (university_id, equipment_id, recorded_at),
  CONSTRAINT chk_energy_values CHECK (power_watts >= 0 AND energy_kwh >= 0),
  CONSTRAINT fk_energy_readings_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_energy_readings_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_energy_readings_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  sensor_id BIGINT UNSIGNED NULL,
  equipment_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  category VARCHAR(80) NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('new', 'acknowledged', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'new',
  source ENUM('simulated', 'physical', 'manual') NOT NULL DEFAULT 'simulated',
  deduplication_key VARCHAR(190) NULL,
  acknowledged_at DATETIME(3) NULL,
  resolved_at DATETIME(3) NULL,
  resolution_notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_alerts_active_dedup (university_id, deduplication_key, status),
  UNIQUE KEY uq_alerts_id_university (id, university_id),
  KEY idx_alerts_tenant_lab_status (university_id, laboratory_id, status, severity),
  CONSTRAINT fk_alerts_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alerts_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alerts_sensor
    FOREIGN KEY (sensor_id, university_id) REFERENCES sensors (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alerts_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alerts_assigned_user
    FOREIGN KEY (assigned_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE maintenance_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  type ENUM('preventive', 'corrective', 'inspection', 'calibration') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  status ENUM('planned', 'in_progress', 'waiting', 'completed', 'cancelled') NOT NULL DEFAULT 'planned',
  checklist_json JSON NULL,
  scheduled_at DATETIME(3) NULL,
  due_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  repair_details TEXT NULL,
  cost DECIMAL(12,2) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_maintenance_tasks_id_university (id, university_id),
  KEY idx_maintenance_tenant_lab_status_due (university_id, laboratory_id, status, due_at),
  CONSTRAINT chk_maintenance_cost CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT fk_maintenance_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_equipment
    FOREIGN KEY (equipment_id, university_id) REFERENCES equipment (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_assigned_user
    FOREIGN KEY (assigned_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_created_by
    FOREIGN KEY (created_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE maintenance_updates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  maintenance_task_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('planned', 'in_progress', 'waiting', 'completed', 'cancelled') NOT NULL,
  notes TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_maintenance_updates_tenant_task_time (university_id, maintenance_task_id, created_at),
  CONSTRAINT fk_maintenance_updates_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_updates_task
    FOREIGN KEY (maintenance_task_id, university_id) REFERENCES maintenance_tasks (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_updates_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE simulation_scenarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  scenario_type ENUM('temperature_rise', 'ventilation_failure', 'equipment_failure', 'sensor_offline', 'overcapacity', 'smoke_incident', 'power_spike', 'energy_saving') NOT NULL,
  description TEXT NULL,
  configuration_json JSON NOT NULL,
  seed_value BIGINT NOT NULL,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_scenarios_id_university (id, university_id),
  KEY idx_scenarios_tenant_lab_status (university_id, laboratory_id, status),
  CONSTRAINT fk_scenarios_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_scenarios_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_scenarios_created_by
    FOREIGN KEY (created_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE simulation_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  scenario_id BIGINT UNSIGNED NOT NULL,
  started_by_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('queued', 'running', 'paused', 'completed', 'stopped', 'failed') NOT NULL DEFAULT 'queued',
  seed_value BIGINT NOT NULL,
  input_json JSON NOT NULL,
  result_json JSON NULL,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_simulation_runs_id_university (id, university_id),
  KEY idx_runs_tenant_lab_status (university_id, laboratory_id, status),
  CONSTRAINT fk_runs_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_runs_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_runs_scenario
    FOREIGN KEY (scenario_id, university_id) REFERENCES simulation_scenarios (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_runs_started_by
    FOREIGN KEY (started_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE sensor_readings
  ADD CONSTRAINT fk_sensor_readings_simulation_run
    FOREIGN KEY (simulation_run_id, university_id) REFERENCES simulation_runs (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NULL,
  generated_by_user_id BIGINT UNSIGNED NOT NULL,
  report_type ENUM('laboratory', 'energy', 'alerts', 'equipment_health', 'maintenance', 'simulation') NOT NULL,
  title VARCHAR(200) NOT NULL,
  period_start DATETIME(3) NULL,
  period_end DATETIME(3) NULL,
  parameters_json JSON NULL,
  status ENUM('queued', 'generating', 'ready', 'failed', 'archived') NOT NULL DEFAULT 'queued',
  file_path VARCHAR(500) NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reports_id_university (id, university_id),
  KEY idx_reports_tenant_type_status (university_id, report_type, status, deleted_at),
  CONSTRAINT fk_reports_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_reports_laboratory
    FOREIGN KEY (laboratory_id, university_id) REFERENCES laboratories (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_reports_generated_by
    FOREIGN KEY (generated_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  alert_id BIGINT UNSIGNED NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_tenant_user_read (university_id, user_id, read_at, created_at),
  CONSTRAINT fk_notifications_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_notifications_alert
    FOREIGN KEY (alert_id, university_id) REFERENCES alerts (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  description VARCHAR(500) NOT NULL,
  metadata_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_activity_logs_tenant_time (university_id, created_at),
  KEY idx_activity_logs_tenant_entity (university_id, entity_type, entity_id),
  CONSTRAINT fk_activity_logs_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE stored_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  university_id BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  category ENUM('university_logo', 'model_3d', 'report', 'maintenance_evidence') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  relative_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  related_entity_type VARCHAR(80) NULL,
  related_entity_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_stored_files_tenant_path (university_id, relative_path),
  KEY idx_stored_files_tenant_category (university_id, category, created_at),
  CONSTRAINT chk_stored_files_size CHECK (size_bytes > 0),
  CONSTRAINT fk_stored_files_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stored_files_uploaded_by
    FOREIGN KEY (uploaded_by_user_id, university_id) REFERENCES users (id, university_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;
