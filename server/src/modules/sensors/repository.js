import { query, withTransaction } from "../../database/query.js";

const assignmentScope = `
  (? = 0 OR EXISTS (
    SELECT 1
    FROM user_laboratory_assignments assignment
    WHERE assignment.university_id = sensor.university_id
      AND assignment.laboratory_id = sensor.laboratory_id
      AND assignment.user_id = ?
  ))
`;

const sortableColumns = {
  name: "sensor.name",
  code: "sensor.code",
  sensorType: "sensor.sensor_type",
  status: "sensor.status",
  updatedAt: "sensor.updated_at",
};

export function createSensorRepository(pool) {
  return {
    async options({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
    }) {
      const laboratories = await query(
        pool,
        `SELECT laboratory.id, laboratory.name, laboratory.code
         FROM laboratories laboratory
         WHERE laboratory.university_id = ?
           AND laboratory.deleted_at IS NULL
           AND (? = 0 OR EXISTS (
             SELECT 1
             FROM user_laboratory_assignments assignment
             WHERE assignment.university_id = laboratory.university_id
               AND assignment.laboratory_id = laboratory.id
               AND assignment.user_id = ?
           ))
         ORDER BY laboratory.name, laboratory.id`,
        [universityId, restrictToAssignments ? 1 : 0, userId],
      );
      const accessible = laboratories.some(
        (item) => String(item.id) === String(laboratoryId),
      );
      if (!laboratoryId || !accessible) {
        return { laboratories, zones: [], equipment: [] };
      }
      const [zones, equipment] = await Promise.all([
        query(
          pool,
          `SELECT id, name, code
           FROM laboratory_zones
           WHERE university_id = ? AND laboratory_id = ?
           ORDER BY name, id`,
          [universityId, laboratoryId],
        ),
        query(
          pool,
          `SELECT id, name, code
           FROM equipment
           WHERE university_id = ?
             AND laboratory_id = ?
             AND deleted_at IS NULL
           ORDER BY name, id`,
          [universityId, laboratoryId],
        ),
      ]);
      return { laboratories, zones, equipment };
    },

    async list({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
      sensorType,
      status,
      search,
      sort,
      direction,
      limit,
      offset,
    }) {
      const filters = [
        "sensor.university_id = ?",
        "sensor.deleted_at IS NULL",
        "laboratory.deleted_at IS NULL",
        assignmentScope,
      ];
      const parameters = [universityId, restrictToAssignments ? 1 : 0, userId];
      if (laboratoryId) {
        filters.push("sensor.laboratory_id = ?");
        parameters.push(laboratoryId);
      }
      if (sensorType) {
        filters.push("sensor.sensor_type = ?");
        parameters.push(sensorType);
      }
      if (status) {
        filters.push("sensor.status = ?");
        parameters.push(status);
      }
      if (search) {
        filters.push("(sensor.name LIKE ? OR sensor.code LIKE ?)");
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const orderColumn = sortableColumns[sort] ?? sortableColumns.name;
      const orderDirection = direction === "desc" ? "DESC" : "ASC";
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT sensor.id, sensor.laboratory_id AS laboratoryId,
                  laboratory.name AS laboratoryName,
                  sensor.zone_id AS zoneId, zone.name AS zoneName,
                  sensor.equipment_id AS equipmentId,
                  equipment.name AS equipmentName,
                  sensor.name, sensor.code,
                  sensor.sensor_type AS sensorType, sensor.unit, sensor.status,
                  sensor.sampling_interval_seconds AS samplingIntervalSeconds,
                  sensor.warning_min AS warningMin,
                  sensor.warning_max AS warningMax,
                  sensor.critical_min AS criticalMin,
                  sensor.critical_max AS criticalMax,
                  sensor.calibrated_at AS calibratedAt,
                  sensor.calibration_due_at AS calibrationDueAt,
                  sensor.position_x AS positionX,
                  sensor.position_y AS positionY,
                  sensor.position_z AS positionZ,
                  sensor.rotation_x AS rotationX,
                  sensor.rotation_y AS rotationY,
                  sensor.rotation_z AS rotationZ,
                  sensor.created_at AS createdAt,
                  sensor.updated_at AS updatedAt
           FROM sensors sensor
           INNER JOIN laboratories laboratory
             ON laboratory.id = sensor.laboratory_id
            AND laboratory.university_id = sensor.university_id
           LEFT JOIN laboratory_zones zone
             ON zone.id = sensor.zone_id
            AND zone.university_id = sensor.university_id
           LEFT JOIN equipment
             ON equipment.id = sensor.equipment_id
            AND equipment.university_id = sensor.university_id
           ${where}
           ORDER BY ${orderColumn} ${orderDirection}, sensor.id ${orderDirection}
           LIMIT ? OFFSET ?`,
          [...parameters, limit, offset],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM sensors sensor
           INNER JOIN laboratories laboratory
             ON laboratory.id = sensor.laboratory_id
            AND laboratory.university_id = sensor.university_id
           ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async findById({ universityId, userId, restrictToAssignments, sensorId }) {
      const rows = await query(
        pool,
        `SELECT sensor.id, sensor.laboratory_id AS laboratoryId,
                laboratory.name AS laboratoryName,
                sensor.zone_id AS zoneId, zone.name AS zoneName,
                sensor.equipment_id AS equipmentId,
                equipment.name AS equipmentName,
                sensor.name, sensor.code,
                sensor.sensor_type AS sensorType, sensor.unit, sensor.status,
                sensor.sampling_interval_seconds AS samplingIntervalSeconds,
                sensor.warning_min AS warningMin,
                sensor.warning_max AS warningMax,
                sensor.critical_min AS criticalMin,
                sensor.critical_max AS criticalMax,
                sensor.calibrated_at AS calibratedAt,
                sensor.calibration_due_at AS calibrationDueAt,
                sensor.position_x AS positionX,
                sensor.position_y AS positionY,
                sensor.position_z AS positionZ,
                sensor.rotation_x AS rotationX,
                sensor.rotation_y AS rotationY,
                sensor.rotation_z AS rotationZ,
                sensor.created_at AS createdAt,
                sensor.updated_at AS updatedAt
         FROM sensors sensor
         INNER JOIN laboratories laboratory
           ON laboratory.id = sensor.laboratory_id
          AND laboratory.university_id = sensor.university_id
         LEFT JOIN laboratory_zones zone
           ON zone.id = sensor.zone_id
          AND zone.university_id = sensor.university_id
         LEFT JOIN equipment
           ON equipment.id = sensor.equipment_id
          AND equipment.university_id = sensor.university_id
         WHERE sensor.university_id = ?
           AND sensor.id = ?
           AND sensor.deleted_at IS NULL
           AND laboratory.deleted_at IS NULL
           AND ${assignmentScope}
         LIMIT 1`,
        [universityId, sensorId, restrictToAssignments ? 1 : 0, userId],
      );
      return rows[0] ?? null;
    },

    async create({
      universityId,
      userId,
      restrictToAssignments,
      sensor,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const relationError = await validateRelations(connection, {
          universityId,
          userId,
          restrictToAssignments,
          sensor,
        });
        if (relationError) return relationError;
        const result = await query(
          connection,
          `INSERT INTO sensors (
             university_id, laboratory_id, zone_id, equipment_id,
             name, code, sensor_type, unit, status,
             sampling_interval_seconds, warning_min, warning_max,
             critical_min, critical_max, calibrated_at, calibration_due_at,
             position_x, position_y, position_z,
             rotation_x, rotation_y, rotation_z
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            sensor.laboratoryId,
            sensor.zoneId,
            sensor.equipmentId,
            sensor.name,
            sensor.code,
            sensor.sensorType,
            sensor.unit,
            sensor.status,
            sensor.samplingIntervalSeconds,
            sensor.warningMin,
            sensor.warningMax,
            sensor.criticalMin,
            sensor.criticalMax,
            sensor.calibratedAt,
            sensor.calibrationDueAt,
            sensor.positionX,
            sensor.positionY,
            sensor.positionZ,
            sensor.rotationX,
            sensor.rotationY,
            sensor.rotationZ,
          ],
        );
        const sensorId = String(result.insertId);
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'sensor.created', 'sensor', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            sensorId,
            `U krijua sensori ${sensor.name}.`,
            JSON.stringify({
              code: sensor.code,
              laboratoryId: sensor.laboratoryId,
              sensorType: sensor.sensorType,
            }),
            ipAddress,
          ],
        );
        return { id: sensorId, ...sensor };
      });
    },

    async update({
      universityId,
      userId,
      restrictToAssignments,
      sensorId,
      sensor,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const existing = await findAccessibleSensor(connection, {
          universityId,
          userId,
          restrictToAssignments,
          sensorId,
        });
        if (!existing) return null;
        const relationError = await validateRelations(connection, {
          universityId,
          userId,
          restrictToAssignments,
          sensor,
        });
        if (relationError) return relationError;
        await query(
          connection,
          `UPDATE sensors
           SET laboratory_id = ?, zone_id = ?, equipment_id = ?,
               name = ?, code = ?, sensor_type = ?, unit = ?, status = ?,
               sampling_interval_seconds = ?, warning_min = ?, warning_max = ?,
               critical_min = ?, critical_max = ?, calibrated_at = ?,
               calibration_due_at = ?, position_x = ?, position_y = ?,
               position_z = ?, rotation_x = ?, rotation_y = ?, rotation_z = ?
           WHERE university_id = ? AND id = ? AND deleted_at IS NULL`,
          [
            sensor.laboratoryId,
            sensor.zoneId,
            sensor.equipmentId,
            sensor.name,
            sensor.code,
            sensor.sensorType,
            sensor.unit,
            sensor.status,
            sensor.samplingIntervalSeconds,
            sensor.warningMin,
            sensor.warningMax,
            sensor.criticalMin,
            sensor.criticalMax,
            sensor.calibratedAt,
            sensor.calibrationDueAt,
            sensor.positionX,
            sensor.positionY,
            sensor.positionZ,
            sensor.rotationX,
            sensor.rotationY,
            sensor.rotationZ,
            universityId,
            sensorId,
          ],
        );
        await writeSensorAudit(connection, {
          universityId,
          userId,
          sensorId,
          action: "sensor.updated",
          description: `U përditësua sensori ${sensor.name}.`,
          metadata: {
            code: sensor.code,
            laboratoryId: sensor.laboratoryId,
            sensorType: sensor.sensorType,
          },
          ipAddress,
        });
        return { id: String(sensorId), ...sensor };
      });
    },

    async archive({
      universityId,
      userId,
      restrictToAssignments,
      sensorId,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const sensor = await findAccessibleSensor(connection, {
          universityId,
          userId,
          restrictToAssignments,
          sensorId,
        });
        if (!sensor) return null;
        await query(
          connection,
          `UPDATE sensors
           SET status = 'archived', deleted_at = UTC_TIMESTAMP(3)
           WHERE university_id = ? AND id = ? AND deleted_at IS NULL`,
          [universityId, sensorId],
        );
        await writeSensorAudit(connection, {
          universityId,
          userId,
          sensorId,
          action: "sensor.archived",
          description: `U arkivua sensori ${sensor.name}.`,
          metadata: { code: sensor.code },
          ipAddress,
        });
        return { id: String(sensorId), name: sensor.name };
      });
    },

    async listCalibrations({
      universityId,
      userId,
      restrictToAssignments,
      sensorId,
    }) {
      const sensor = await findAccessibleSensor(pool, {
        universityId,
        userId,
        restrictToAssignments,
        sensorId,
        lock: false,
      });
      if (!sensor) return null;
      return query(
        pool,
        `SELECT calibration.id, calibration.result,
                calibration.calibrated_at AS calibratedAt,
                calibration.calibration_due_at AS calibrationDueAt,
                calibration.notes,
                calibration.performed_by_user_id AS performedByUserId,
                performer.full_name AS performedByUserName,
                calibration.created_at AS createdAt
         FROM sensor_calibrations calibration
         INNER JOIN users performer
           ON performer.id = calibration.performed_by_user_id
          AND performer.university_id = calibration.university_id
         WHERE calibration.university_id = ?
           AND calibration.sensor_id = ?
         ORDER BY calibration.calibrated_at DESC, calibration.id DESC`,
        [universityId, sensorId],
      );
    },

    async createCalibration({
      universityId,
      userId,
      restrictToAssignments,
      sensorId,
      calibration,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const sensor = await findAccessibleSensor(connection, {
          universityId,
          userId,
          restrictToAssignments,
          sensorId,
        });
        if (!sensor) return null;
        const result = await query(
          connection,
          `INSERT INTO sensor_calibrations (
             university_id, laboratory_id, sensor_id, performed_by_user_id,
             result, calibrated_at, calibration_due_at, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            sensor.laboratoryId,
            sensorId,
            userId,
            calibration.result,
            calibration.calibratedAt,
            calibration.calibrationDueAt,
            calibration.notes,
          ],
        );
        await query(
          connection,
          `UPDATE sensors
           SET calibrated_at = ?, calibration_due_at = ?
           WHERE university_id = ? AND id = ? AND deleted_at IS NULL`,
          [
            calibration.calibratedAt,
            calibration.calibrationDueAt,
            universityId,
            sensorId,
          ],
        );
        const calibrationId = String(result.insertId);
        await writeSensorAudit(connection, {
          universityId,
          userId,
          sensorId,
          action: "sensor.calibrated",
          description: `U regjistrua kalibrimi i sensorit ${sensor.name}.`,
          metadata: {
            calibrationId,
            result: calibration.result,
            calibratedAt: calibration.calibratedAt,
          },
          ipAddress,
        });
        return {
          id: calibrationId,
          sensorId: String(sensorId),
          performedByUserId: String(userId),
          ...calibration,
        };
      });
    },
  };
}

async function findAccessibleSensor(
  connection,
  { universityId, userId, restrictToAssignments, sensorId, lock = true },
) {
  const rows = await query(
    connection,
    `SELECT sensor.id, sensor.laboratory_id AS laboratoryId,
            sensor.name, sensor.code
     FROM sensors sensor
     WHERE sensor.university_id = ?
       AND sensor.id = ?
       AND sensor.deleted_at IS NULL
       AND ${assignmentScope}
     ${lock ? "FOR UPDATE" : ""}`,
    [universityId, sensorId, restrictToAssignments ? 1 : 0, userId],
  );
  return rows[0] ?? null;
}

async function validateRelations(
  connection,
  { universityId, userId, restrictToAssignments, sensor },
) {
  const laboratories = await query(
    connection,
    `SELECT laboratory.id
     FROM laboratories laboratory
     WHERE laboratory.university_id = ?
       AND laboratory.id = ?
       AND laboratory.deleted_at IS NULL
       AND (? = 0 OR EXISTS (
         SELECT 1
         FROM user_laboratory_assignments assignment
         WHERE assignment.university_id = laboratory.university_id
           AND assignment.laboratory_id = laboratory.id
           AND assignment.user_id = ?
       ))
     LIMIT 1`,
    [universityId, sensor.laboratoryId, restrictToAssignments ? 1 : 0, userId],
  );
  if (!laboratories[0]) return { invalidLaboratory: true };

  if (sensor.zoneId) {
    const zones = await query(
      connection,
      `SELECT id FROM laboratory_zones
       WHERE university_id = ? AND laboratory_id = ? AND id = ?
       LIMIT 1`,
      [universityId, sensor.laboratoryId, sensor.zoneId],
    );
    if (!zones[0]) return { invalidZone: true };
  }

  if (sensor.equipmentId) {
    const equipment = await query(
      connection,
      `SELECT id FROM equipment
       WHERE university_id = ? AND laboratory_id = ? AND id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [universityId, sensor.laboratoryId, sensor.equipmentId],
    );
    if (!equipment[0]) return { invalidEquipment: true };
  }
  return null;
}

function writeSensorAudit(
  connection,
  { universityId, userId, sensorId, action, description, metadata, ipAddress },
) {
  return query(
    connection,
    `INSERT INTO activity_logs (
       university_id, user_id, action, entity_type, entity_id,
       description, metadata_json, ip_address
     ) VALUES (?, ?, ?, 'sensor', ?, ?, ?, ?)`,
    [
      universityId,
      userId,
      action,
      sensorId,
      description,
      JSON.stringify(metadata),
      ipAddress,
    ],
  );
}
