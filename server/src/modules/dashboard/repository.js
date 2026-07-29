import { query } from "../../database/query.js";

const unrestrictedRoles = new Set(["university_admin"]);

export function createDashboardRepository(pool) {
  return {
    async summary({ universityId, userId, roles }) {
      const unrestricted = roles.some((role) => unrestrictedRoles.has(role));
      const rows = await query(
        pool,
        `WITH accessible_laboratories AS (
           SELECT laboratory.id
           FROM laboratories laboratory
           WHERE laboratory.university_id = ?
             AND laboratory.deleted_at IS NULL
             AND laboratory.status <> 'archived'
             AND (
               ? = TRUE OR EXISTS (
                 SELECT 1
                 FROM user_laboratory_assignments assignment
                 WHERE assignment.university_id = laboratory.university_id
                   AND assignment.laboratory_id = laboratory.id
                   AND assignment.user_id = ?
               )
             )
         ),
         scoped_equipment AS (
           SELECT equipment.*
           FROM equipment
           INNER JOIN accessible_laboratories laboratory
             ON laboratory.id = equipment.laboratory_id
           WHERE equipment.university_id = ?
             AND equipment.deleted_at IS NULL
             AND equipment.status <> 'archived'
         ),
         scoped_sensors AS (
           SELECT sensor.*
           FROM sensors sensor
           INNER JOIN accessible_laboratories laboratory
             ON laboratory.id = sensor.laboratory_id
           WHERE sensor.university_id = ?
             AND sensor.deleted_at IS NULL
             AND sensor.status <> 'archived'
         ),
         latest_energy AS (
           SELECT power_watts AS powerWatts,
                  ROW_NUMBER() OVER (
                    PARTITION BY laboratory_id, COALESCE(equipment_id, 0)
                    ORDER BY recorded_at DESC, id DESC
                  ) AS rowNumber
           FROM energy_readings
           WHERE university_id = ?
             AND laboratory_id IN (SELECT id FROM accessible_laboratories)
         ),
         latest_occupancy AS (
           SELECT reading.value,
                  ROW_NUMBER() OVER (
                    PARTITION BY reading.sensor_id
                    ORDER BY reading.recorded_at DESC, reading.id DESC
                  ) AS rowNumber
           FROM sensor_readings reading
           INNER JOIN scoped_sensors sensor ON sensor.id = reading.sensor_id
           WHERE reading.university_id = ?
             AND sensor.sensor_type = 'occupancy'
         )
         SELECT
           (SELECT COUNT(*) FROM accessible_laboratories) AS laboratories,
           (SELECT COUNT(*) FROM scoped_equipment WHERE status = 'active')
             AS activeEquipment,
           (SELECT COUNT(*) FROM scoped_equipment WHERE status = 'fault')
             AS faultEquipment,
           (SELECT COUNT(*) FROM scoped_equipment) AS totalEquipment,
           (SELECT COALESCE(AVG(health_score), 100) FROM scoped_equipment)
             AS averageEquipmentHealth,
           (SELECT COUNT(*) FROM scoped_sensors WHERE status = 'online')
             AS onlineSensors,
           (SELECT COUNT(*) FROM scoped_sensors WHERE status = 'offline')
             AS offlineSensors,
           (SELECT COUNT(*) FROM scoped_sensors) AS totalSensors,
           (SELECT COUNT(*)
              FROM alerts alert_record
              WHERE alert_record.university_id = ?
                AND alert_record.laboratory_id
                  IN (SELECT id FROM accessible_laboratories)
                AND alert_record.status
                  IN ('new', 'acknowledged', 'in_progress'))
             AS activeAlerts,
           (SELECT COUNT(*)
              FROM alerts alert_record
              WHERE alert_record.university_id = ?
                AND alert_record.laboratory_id
                  IN (SELECT id FROM accessible_laboratories)
                AND alert_record.severity = 'critical'
                AND alert_record.status
                  IN ('new', 'acknowledged', 'in_progress'))
             AS criticalAlerts,
           (SELECT COALESCE(SUM(powerWatts), 0)
              FROM latest_energy WHERE rowNumber = 1)
             AS currentPowerWatts,
           (SELECT COALESCE(SUM(value), 0)
              FROM latest_occupancy WHERE rowNumber = 1)
             AS currentOccupancy,
           ((SELECT COUNT(*)
               FROM sensor_readings reading
               WHERE reading.university_id = ?
                 AND reading.laboratory_id
                   IN (SELECT id FROM accessible_laboratories)
                 AND reading.source = 'simulated')
             +
            (SELECT COUNT(*)
               FROM energy_readings reading
               WHERE reading.university_id = ?
                 AND reading.laboratory_id
                   IN (SELECT id FROM accessible_laboratories)
                 AND reading.source = 'simulated'))
             AS simulatedReadingCount,
           (SELECT COUNT(*)
              FROM maintenance_tasks task
              WHERE task.university_id = ?
                AND task.laboratory_id
                  IN (SELECT id FROM accessible_laboratories)
                AND task.status IN ('planned', 'in_progress', 'waiting'))
             AS plannedMaintenance`,
        [
          universityId,
          unrestricted,
          userId,
          universityId,
          universityId,
          universityId,
          universityId,
          universityId,
          universityId,
          universityId,
          universityId,
          universityId,
        ],
      );
      return rows[0];
    },
  };
}
