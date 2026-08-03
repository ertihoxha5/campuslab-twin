import { query } from "../../database/query.js";

const assignmentScope = `
  (? = 0 OR EXISTS (
    SELECT 1 FROM user_laboratory_assignments assignment
    WHERE assignment.university_id = alert_record.university_id
      AND assignment.laboratory_id = alert_record.laboratory_id
      AND assignment.user_id = ?
  ))
`;

export function createAlertRepository(pool) {
  return {
    async list({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
      status,
      severity,
      search,
      limit,
      offset,
    }) {
      const filters = ["alert_record.university_id = ?", assignmentScope];
      const parameters = [universityId, restrictToAssignments ? 1 : 0, userId];
      if (laboratoryId) {
        filters.push("alert_record.laboratory_id = ?");
        parameters.push(laboratoryId);
      }
      if (status) {
        filters.push("alert_record.status = ?");
        parameters.push(status);
      }
      if (severity) {
        filters.push("alert_record.severity = ?");
        parameters.push(severity);
      }
      if (search) {
        filters.push(
          "(alert_record.title LIKE ? OR alert_record.description LIKE ? OR alert_record.category LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const paginationLimit = Math.max(1, Math.trunc(Number(limit)) || 1);
      const paginationOffset = Math.max(0, Math.trunc(Number(offset)) || 0);
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT alert_record.id, alert_record.laboratory_id AS laboratoryId,
                  laboratory.name AS laboratoryName,
                  alert_record.sensor_id AS sensorId, sensor.name AS sensorName,
                  alert_record.equipment_id AS equipmentId,
                  equipment.name AS equipmentName,
                  alert_record.assigned_user_id AS assignedUserId,
                  assigned.full_name AS assignedUserName,
                  alert_record.category, alert_record.severity,
                  alert_record.title, alert_record.description,
                  alert_record.status, alert_record.source,
                  alert_record.acknowledged_at AS acknowledgedAt,
                  alert_record.resolved_at AS resolvedAt,
                  alert_record.last_triggered_at AS lastTriggeredAt,
                  alert_record.created_at AS createdAt,
                  alert_record.updated_at AS updatedAt
           FROM alerts alert_record
           INNER JOIN laboratories laboratory
             ON laboratory.id = alert_record.laboratory_id
            AND laboratory.university_id = alert_record.university_id
           LEFT JOIN sensors sensor
             ON sensor.id = alert_record.sensor_id
            AND sensor.university_id = alert_record.university_id
           LEFT JOIN equipment
             ON equipment.id = alert_record.equipment_id
            AND equipment.university_id = alert_record.university_id
           LEFT JOIN users assigned
             ON assigned.id = alert_record.assigned_user_id
            AND assigned.university_id = alert_record.university_id
           ${where}
           ORDER BY FIELD(alert_record.severity, 'critical', 'warning', 'info'),
                    alert_record.created_at DESC, alert_record.id DESC
           LIMIT ${paginationLimit} OFFSET ${paginationOffset}`,
          parameters,
        ),
        query(pool, `SELECT COUNT(*) AS total FROM alerts alert_record ${where}`, parameters),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async findById({
      universityId,
      userId,
      restrictToAssignments,
      alertId,
    }) {
      const rows = await query(
        pool,
        `SELECT alert_record.id, alert_record.laboratory_id AS laboratoryId,
                laboratory.name AS laboratoryName,
                alert_record.sensor_id AS sensorId, sensor.name AS sensorName,
                alert_record.equipment_id AS equipmentId,
                equipment.name AS equipmentName,
                alert_record.assigned_user_id AS assignedUserId,
                assigned.full_name AS assignedUserName,
                alert_record.category, alert_record.severity,
                alert_record.title, alert_record.description,
                alert_record.status, alert_record.source,
                alert_record.deduplication_key AS deduplicationKey,
                alert_record.acknowledged_at AS acknowledgedAt,
                alert_record.resolved_at AS resolvedAt,
                alert_record.resolution_notes AS resolutionNotes,
                alert_record.last_triggered_at AS lastTriggeredAt,
                alert_record.created_at AS createdAt,
                alert_record.updated_at AS updatedAt
         FROM alerts alert_record
         INNER JOIN laboratories laboratory
           ON laboratory.id = alert_record.laboratory_id
          AND laboratory.university_id = alert_record.university_id
         LEFT JOIN sensors sensor
           ON sensor.id = alert_record.sensor_id
          AND sensor.university_id = alert_record.university_id
         LEFT JOIN equipment
           ON equipment.id = alert_record.equipment_id
          AND equipment.university_id = alert_record.university_id
         LEFT JOIN users assigned
           ON assigned.id = alert_record.assigned_user_id
          AND assigned.university_id = alert_record.university_id
         WHERE alert_record.university_id = ? AND alert_record.id = ?
           AND ${assignmentScope}
         LIMIT 1`,
        [
          universityId,
          alertId,
          restrictToAssignments ? 1 : 0,
          userId,
        ],
      );
      return rows[0] ?? null;
    },
  };
}
