SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS stored_files;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS simulation_runs;
DROP TABLE IF EXISTS simulation_scenarios;
DROP TABLE IF EXISTS maintenance_updates;
DROP TABLE IF EXISTS maintenance_tasks;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS energy_readings;
DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS laboratory_zones;
DROP TABLE IF EXISTS user_laboratory_assignments;
DROP TABLE IF EXISTS laboratories;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS university_registration_requests;
DROP TABLE IF EXISTS platform_admins;
DROP TABLE IF EXISTS universities;

SET FOREIGN_KEY_CHECKS = 1;
