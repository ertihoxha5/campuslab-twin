import { query, withTransaction } from "../../database/query.js";

const assignmentScope = `
  (? = 0 OR EXISTS (
    SELECT 1
    FROM user_laboratory_assignments assignment
    WHERE assignment.university_id = equipment.university_id
      AND assignment.laboratory_id = equipment.laboratory_id
      AND assignment.user_id = ?
  ))
`;

const sortableColumns = {
  name: "equipment.name",
  code: "equipment.code",
  type: "equipment.type",
  status: "equipment.status",
  healthScore: "equipment.health_score",
  updatedAt: "equipment.updated_at",
};

export function createEquipmentRepository(pool) {
  return {
    async options({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
    }) {
      const accessParameters = [
        universityId,
        restrictToAssignments ? 1 : 0,
        userId,
      ];
      const [laboratories, users] = await Promise.all([
        query(
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
          accessParameters,
        ),
        query(
          pool,
          `SELECT id, full_name AS fullName, job_title AS jobTitle
           FROM users
           WHERE university_id = ?
             AND status = 'active'
             AND deleted_at IS NULL
           ORDER BY full_name, id`,
          [universityId],
        ),
      ]);
      const laboratoryIsAccessible =
        laboratoryId &&
        laboratories.some((item) => String(item.id) === String(laboratoryId));
      const zones = laboratoryIsAccessible
        ? await query(
            pool,
            `SELECT id, name, code
             FROM laboratory_zones
             WHERE university_id = ?
               AND laboratory_id = ?
             ORDER BY name, id`,
            [universityId, laboratoryId],
          )
        : [];
      return { laboratories, zones, users };
    },

    async list({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
      status,
      search,
      sort,
      direction,
      limit,
      offset,
    }) {
      const filters = [
        "equipment.university_id = ?",
        "equipment.deleted_at IS NULL",
        "laboratory.deleted_at IS NULL",
        assignmentScope,
      ];
      const parameters = [universityId, restrictToAssignments ? 1 : 0, userId];
      if (laboratoryId) {
        filters.push("equipment.laboratory_id = ?");
        parameters.push(laboratoryId);
      }
      if (status) {
        filters.push("equipment.status = ?");
        parameters.push(status);
      }
      if (search) {
        const pattern = `%${search}%`;
        filters.push(
          "(equipment.name LIKE ? OR equipment.code LIKE ? OR equipment.type LIKE ? OR equipment.serial_number LIKE ?)",
        );
        parameters.push(pattern, pattern, pattern, pattern);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const orderColumn = sortableColumns[sort] ?? sortableColumns.name;
      const orderDirection = direction === "desc" ? "DESC" : "ASC";
      const paginationLimit = Math.max(1, Math.trunc(Number(limit)) || 1);
      const paginationOffset = Math.max(0, Math.trunc(Number(offset)) || 0);
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT equipment.id, equipment.laboratory_id AS laboratoryId,
                  laboratory.name AS laboratoryName,
                  equipment.zone_id AS zoneId, zone.name AS zoneName,
                  equipment.responsible_user_id AS responsibleUserId,
                  responsible.full_name AS responsibleUserName,
                  equipment.name, equipment.code, equipment.type,
                  equipment.manufacturer, equipment.model,
                  equipment.serial_number AS serialNumber,
                  equipment.status, equipment.purchase_date AS purchaseDate,
                  equipment.warranty_expires_at AS warrantyExpiresAt,
                  equipment.energy_rating_watts AS energyRatingWatts,
                  equipment.health_score AS healthScore,
                  equipment.object_3d_reference AS object3dReference,
                  equipment.created_at AS createdAt,
                  equipment.updated_at AS updatedAt
           FROM equipment
           INNER JOIN laboratories laboratory
             ON laboratory.id = equipment.laboratory_id
            AND laboratory.university_id = equipment.university_id
           LEFT JOIN laboratory_zones zone
             ON zone.id = equipment.zone_id
            AND zone.university_id = equipment.university_id
           LEFT JOIN users responsible
             ON responsible.id = equipment.responsible_user_id
            AND responsible.university_id = equipment.university_id
           ${where}
           ORDER BY ${orderColumn} ${orderDirection},
                    equipment.id ${orderDirection}
           LIMIT ${paginationLimit} OFFSET ${paginationOffset}`,
          parameters,
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM equipment
           INNER JOIN laboratories laboratory
             ON laboratory.id = equipment.laboratory_id
            AND laboratory.university_id = equipment.university_id
           ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async findById({
      universityId,
      userId,
      restrictToAssignments,
      equipmentId,
    }) {
      const rows = await query(
        pool,
        `SELECT equipment.id, equipment.laboratory_id AS laboratoryId,
                laboratory.name AS laboratoryName,
                equipment.zone_id AS zoneId, zone.name AS zoneName,
                equipment.responsible_user_id AS responsibleUserId,
                responsible.full_name AS responsibleUserName,
                equipment.name, equipment.code, equipment.type,
                equipment.manufacturer, equipment.model,
                equipment.serial_number AS serialNumber,
                equipment.status, equipment.purchase_date AS purchaseDate,
                equipment.warranty_expires_at AS warrantyExpiresAt,
                equipment.energy_rating_watts AS energyRatingWatts,
                equipment.health_score AS healthScore,
                equipment.object_3d_reference AS object3dReference,
                equipment.created_at AS createdAt,
                equipment.updated_at AS updatedAt
         FROM equipment
         INNER JOIN laboratories laboratory
           ON laboratory.id = equipment.laboratory_id
          AND laboratory.university_id = equipment.university_id
         LEFT JOIN laboratory_zones zone
           ON zone.id = equipment.zone_id
          AND zone.university_id = equipment.university_id
         LEFT JOIN users responsible
           ON responsible.id = equipment.responsible_user_id
          AND responsible.university_id = equipment.university_id
         WHERE equipment.university_id = ?
           AND equipment.id = ?
           AND equipment.deleted_at IS NULL
           AND laboratory.deleted_at IS NULL
           AND ${assignmentScope}
         LIMIT 1`,
        [universityId, equipmentId, restrictToAssignments ? 1 : 0, userId],
      );
      return rows[0] ?? null;
    },

    async create({
      universityId,
      userId,
      restrictToAssignments,
      ipAddress,
      equipment,
    }) {
      return withTransaction(pool, async (connection) => {
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
          [
            universityId,
            equipment.laboratoryId,
            restrictToAssignments ? 1 : 0,
            userId,
          ],
        );
        if (!laboratories[0]) return { invalidLaboratory: true };

        if (equipment.zoneId) {
          const zones = await query(
            connection,
            `SELECT id
             FROM laboratory_zones
             WHERE university_id = ?
               AND laboratory_id = ?
               AND id = ?
             LIMIT 1`,
            [universityId, equipment.laboratoryId, equipment.zoneId],
          );
          if (!zones[0]) return { invalidZone: true };
        }

        if (equipment.responsibleUserId) {
          const users = await query(
            connection,
            `SELECT id
             FROM users
             WHERE university_id = ?
               AND id = ?
               AND status = 'active'
               AND deleted_at IS NULL
             LIMIT 1`,
            [universityId, equipment.responsibleUserId],
          );
          if (!users[0]) return { invalidResponsibleUser: true };
        }

        const result = await query(
          connection,
          `INSERT INTO equipment (
             university_id, laboratory_id, zone_id, responsible_user_id,
             name, code, type, manufacturer, model, serial_number, status,
             purchase_date, warranty_expires_at, energy_rating_watts,
             health_score, object_3d_reference
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            equipment.laboratoryId,
            equipment.zoneId,
            equipment.responsibleUserId,
            equipment.name,
            equipment.code,
            equipment.type,
            equipment.manufacturer,
            equipment.model,
            equipment.serialNumber,
            equipment.status,
            equipment.purchaseDate,
            equipment.warrantyExpiresAt,
            equipment.energyRatingWatts,
            equipment.healthScore,
            equipment.object3dReference,
          ],
        );

        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'equipment.created', 'equipment', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            result.insertId,
            `U krijua pajisja ${equipment.name}.`,
            JSON.stringify({
              code: equipment.code,
              laboratoryId: equipment.laboratoryId,
            }),
            ipAddress,
          ],
        );

        return { id: String(result.insertId), ...equipment };
      });
    },

    async update({
      universityId,
      userId,
      restrictToAssignments,
      equipmentId,
      ipAddress,
      equipment,
    }) {
      return withTransaction(pool, async (connection) => {
        const current = await findAccessibleEquipment(connection, {
          universityId,
          userId,
          restrictToAssignments,
          equipmentId,
        });
        if (!current) return null;

        const relationError = await validateEquipmentRelations(connection, {
          universityId,
          userId,
          restrictToAssignments,
          equipment,
        });
        if (relationError) return relationError;

        await query(
          connection,
          `UPDATE equipment
           SET laboratory_id = ?, zone_id = ?, responsible_user_id = ?,
               name = ?, code = ?, type = ?, manufacturer = ?, model = ?,
               serial_number = ?, status = ?, purchase_date = ?,
               warranty_expires_at = ?, energy_rating_watts = ?,
               health_score = ?, object_3d_reference = ?
           WHERE university_id = ?
             AND id = ?
             AND deleted_at IS NULL`,
          [
            equipment.laboratoryId,
            equipment.zoneId,
            equipment.responsibleUserId,
            equipment.name,
            equipment.code,
            equipment.type,
            equipment.manufacturer,
            equipment.model,
            equipment.serialNumber,
            equipment.status,
            equipment.purchaseDate,
            equipment.warrantyExpiresAt,
            equipment.energyRatingWatts,
            equipment.healthScore,
            equipment.object3dReference,
            universityId,
            equipmentId,
          ],
        );
        await writeEquipmentAudit(connection, {
          universityId,
          userId,
          equipmentId,
          action: "equipment.updated",
          description: `U përditësua pajisja ${equipment.name}.`,
          metadata: {
            code: equipment.code,
            laboratoryId: equipment.laboratoryId,
          },
          ipAddress,
        });
        return { id: String(equipmentId), ...equipment };
      });
    },

    async archive({
      universityId,
      userId,
      restrictToAssignments,
      equipmentId,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const equipment = await findAccessibleEquipment(connection, {
          universityId,
          userId,
          restrictToAssignments,
          equipmentId,
        });
        if (!equipment) return null;

        await query(
          connection,
          `UPDATE equipment
           SET status = 'archived', deleted_at = UTC_TIMESTAMP(3)
           WHERE university_id = ?
             AND id = ?
             AND deleted_at IS NULL`,
          [universityId, equipmentId],
        );
        await writeEquipmentAudit(connection, {
          universityId,
          userId,
          equipmentId,
          action: "equipment.archived",
          description: `U arkivua pajisja ${equipment.name}.`,
          metadata: { code: equipment.code },
          ipAddress,
        });
        return { id: String(equipmentId), name: equipment.name };
      });
    },
  };
}

async function findAccessibleEquipment(
  connection,
  { universityId, userId, restrictToAssignments, equipmentId },
) {
  const rows = await query(
    connection,
    `SELECT equipment.id, equipment.name, equipment.code
     FROM equipment
     WHERE equipment.university_id = ?
       AND equipment.id = ?
       AND equipment.deleted_at IS NULL
       AND ${assignmentScope}
     FOR UPDATE`,
    [universityId, equipmentId, restrictToAssignments ? 1 : 0, userId],
  );
  return rows[0] ?? null;
}

async function validateEquipmentRelations(
  connection,
  { universityId, userId, restrictToAssignments, equipment },
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
    [
      universityId,
      equipment.laboratoryId,
      restrictToAssignments ? 1 : 0,
      userId,
    ],
  );
  if (!laboratories[0]) return { invalidLaboratory: true };

  if (equipment.zoneId) {
    const zones = await query(
      connection,
      `SELECT id
       FROM laboratory_zones
       WHERE university_id = ?
         AND laboratory_id = ?
         AND id = ?
       LIMIT 1`,
      [universityId, equipment.laboratoryId, equipment.zoneId],
    );
    if (!zones[0]) return { invalidZone: true };
  }

  if (equipment.responsibleUserId) {
    const users = await query(
      connection,
      `SELECT id
       FROM users
       WHERE university_id = ?
         AND id = ?
         AND status = 'active'
         AND deleted_at IS NULL
       LIMIT 1`,
      [universityId, equipment.responsibleUserId],
    );
    if (!users[0]) return { invalidResponsibleUser: true };
  }
  return null;
}

function writeEquipmentAudit(
  connection,
  {
    universityId,
    userId,
    equipmentId,
    action,
    description,
    metadata,
    ipAddress,
  },
) {
  return query(
    connection,
    `INSERT INTO activity_logs (
       university_id, user_id, action, entity_type, entity_id,
       description, metadata_json, ip_address
     ) VALUES (?, ?, ?, 'equipment', ?, ?, ?, ?)`,
    [
      universityId,
      userId,
      action,
      equipmentId,
      description,
      JSON.stringify(metadata),
      ipAddress,
    ],
  );
}
