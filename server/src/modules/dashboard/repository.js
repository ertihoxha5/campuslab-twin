import { query } from "../../database/query.js";

const unrestrictedRoles = new Set(["university_admin"]);

const accessibleLaboratoriesCte = `
  WITH accessible_laboratories AS (
    SELECT laboratory.id, laboratory.name, laboratory.code,
           laboratory.status, laboratory.capacity
    FROM laboratories laboratory
    WHERE laboratory.university_id = ?
      AND laboratory.deleted_at IS NULL
      AND laboratory.status <> 'archived'
      AND (? IS NULL OR laboratory.id = ?)
      AND (
        ? = TRUE OR EXISTS (
          SELECT 1
          FROM user_laboratory_assignments assignment
          WHERE assignment.university_id = laboratory.university_id
            AND assignment.laboratory_id = laboratory.id
            AND assignment.user_id = ?
        )
      )
  )`;

function accessParameters({ universityId, userId, roles, laboratoryId }) {
  return [
    universityId,
    laboratoryId ?? null,
    laboratoryId ?? null,
    roles.some((role) => unrestrictedRoles.has(role)),
    userId,
  ];
}

export function createDashboardRepository(pool) {
  return {
    async summary(context) {
      const { universityId, userId, roles, laboratoryId = null } = context;
      const unrestricted = roles.some((role) => unrestrictedRoles.has(role));
      const rows = await query(
        pool,
        `WITH accessible_laboratories AS (
           SELECT laboratory.id
           FROM laboratories laboratory
           WHERE laboratory.university_id = ?
             AND laboratory.deleted_at IS NULL
             AND laboratory.status <> 'archived'
             AND (? IS NULL OR laboratory.id = ?)
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
          laboratoryId,
          laboratoryId,
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

    async details(context) {
      const { universityId } = context;
      const scoped = () => accessParameters(context);
      const [
        recentAlerts,
        latestSensorReadings,
        laboratoryHealth,
        energyTrend,
        equipmentStatus,
        recentActivities,
        upcomingMaintenance,
        laboratories,
      ] = await Promise.all([
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT id, title, severity, status, source,
                  laboratoryName, createdAt
           FROM (
             SELECT alert_record.id, alert_record.title,
                    alert_record.severity, alert_record.status,
                    alert_record.source,
                    laboratory.name AS laboratoryName,
                    alert_record.created_at AS createdAt,
                    ROW_NUMBER() OVER (
                      ORDER BY alert_record.created_at DESC, alert_record.id DESC
                    ) AS rowNumber
             FROM alerts alert_record
             INNER JOIN accessible_laboratories laboratory
               ON laboratory.id = alert_record.laboratory_id
             WHERE alert_record.university_id = ?
           ) ranked
           WHERE rowNumber <= 5 ORDER BY rowNumber`,
          [...scoped(), universityId],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT id, sensorName, sensorType, unit, value, source,
                  laboratoryName, recordedAt
           FROM (
             SELECT reading.id, sensor.name AS sensorName,
                    sensor.sensor_type AS sensorType, sensor.unit,
                    reading.value, reading.source,
                    laboratory.name AS laboratoryName,
                    reading.recorded_at AS recordedAt,
                    ROW_NUMBER() OVER (
                      PARTITION BY reading.sensor_id
                      ORDER BY reading.recorded_at DESC, reading.id DESC
                    ) AS sensorRow
             FROM sensor_readings reading
             INNER JOIN sensors sensor
               ON sensor.id = reading.sensor_id
              AND sensor.university_id = reading.university_id
             INNER JOIN accessible_laboratories laboratory
               ON laboratory.id = reading.laboratory_id
             WHERE reading.university_id = ?
               AND sensor.deleted_at IS NULL
               AND sensor.status <> 'archived'
           ) latest
           WHERE sensorRow = 1
           ORDER BY recordedAt DESC, id DESC
           LIMIT 8`,
          [...scoped(), universityId],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT laboratory.id, laboratory.name, laboratory.code,
                  laboratory.status, laboratory.capacity,
                  COALESCE(AVG(equipment.health_score), 100) AS equipmentHealth,
                  COUNT(DISTINCT CASE WHEN sensor.status = 'online'
                    THEN sensor.id END) AS onlineSensors,
                  COUNT(DISTINCT sensor.id) AS totalSensors,
                  COUNT(DISTINCT CASE WHEN alert_record.status
                    IN ('new', 'acknowledged', 'in_progress')
                    THEN alert_record.id END) AS activeAlerts
           FROM accessible_laboratories laboratory
           LEFT JOIN equipment
             ON equipment.university_id = ?
            AND equipment.laboratory_id = laboratory.id
            AND equipment.deleted_at IS NULL
            AND equipment.status <> 'archived'
           LEFT JOIN sensors sensor
             ON sensor.university_id = ?
            AND sensor.laboratory_id = laboratory.id
            AND sensor.deleted_at IS NULL
            AND sensor.status <> 'archived'
           LEFT JOIN alerts alert_record
             ON alert_record.university_id = ?
            AND alert_record.laboratory_id = laboratory.id
           GROUP BY laboratory.id, laboratory.name, laboratory.code,
                    laboratory.status, laboratory.capacity
           ORDER BY laboratory.name`,
          [...scoped(), universityId, universityId, universityId],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT DATE_FORMAT(reading.recorded_at, '%Y-%m-%d %H:00:00')
                    AS recordedAt,
                  ROUND(AVG(reading.power_watts), 2) AS averagePowerWatts,
                  ROUND(SUM(reading.energy_kwh), 4) AS energyKwh,
                  MAX(reading.source = 'simulated') AS containsSimulation
           FROM energy_readings reading
           INNER JOIN accessible_laboratories laboratory
             ON laboratory.id = reading.laboratory_id
           WHERE reading.university_id = ?
             AND reading.recorded_at >=
               DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
           GROUP BY DATE_FORMAT(reading.recorded_at, '%Y-%m-%d %H:00:00')
           ORDER BY recordedAt`,
          [...scoped(), universityId, context.hours],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT equipment.status, COUNT(*) AS total
           FROM equipment
           INNER JOIN accessible_laboratories laboratory
             ON laboratory.id = equipment.laboratory_id
           WHERE equipment.university_id = ?
             AND equipment.deleted_at IS NULL
             AND equipment.status <> 'archived'
           GROUP BY equipment.status
           ORDER BY equipment.status`,
          [...scoped(), universityId],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT id, action, description, userName, createdAt
           FROM (
             SELECT activity.id, activity.action, activity.description,
                    COALESCE(user.full_name, 'Sistemi') AS userName,
                    activity.created_at AS createdAt,
                    ROW_NUMBER() OVER (
                      ORDER BY activity.created_at DESC, activity.id DESC
                    ) AS rowNumber
             FROM activity_logs activity
             LEFT JOIN users user
               ON user.id = activity.user_id
              AND user.university_id = activity.university_id
             WHERE activity.university_id = ?
               AND (? = TRUE OR activity.user_id = ?)
           ) ranked
           WHERE rowNumber <= 6 ORDER BY rowNumber`,
          [
            ...scoped(),
            universityId,
            context.roles.some((role) => unrestrictedRoles.has(role)),
            context.userId,
          ],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT id, title, priority, status, laboratoryName,
                  equipmentName, dueAt
           FROM (
             SELECT task.id, task.title, task.priority, task.status,
                    laboratory.name AS laboratoryName,
                    equipment.name AS equipmentName, task.due_at AS dueAt,
                    ROW_NUMBER() OVER (
                      ORDER BY task.due_at IS NULL, task.due_at, task.id
                    ) AS rowNumber
             FROM maintenance_tasks task
             INNER JOIN accessible_laboratories laboratory
               ON laboratory.id = task.laboratory_id
             INNER JOIN equipment
               ON equipment.id = task.equipment_id
              AND equipment.university_id = task.university_id
             WHERE task.university_id = ?
               AND task.status IN ('planned', 'in_progress', 'waiting')
           ) ranked
           WHERE rowNumber <= 5 ORDER BY rowNumber`,
          [...scoped(), universityId],
        ),
        query(
          pool,
          `${accessibleLaboratoriesCte}
           SELECT id, name, code, status, capacity
           FROM accessible_laboratories ORDER BY name`,
          scoped(),
        ),
      ]);

      return {
        recentAlerts,
        latestSensorReadings,
        laboratoryHealth,
        energyTrend,
        equipmentStatus,
        recentActivities,
        upcomingMaintenance,
        laboratories,
      };
    },
  };
}
