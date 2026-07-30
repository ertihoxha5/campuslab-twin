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

export function createEquipmentRepository(pool) {
  return {
    async list({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
      status,
      search,
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
           ORDER BY equipment.name, equipment.id
           LIMIT ? OFFSET ?`,
          [...parameters, limit, offset],
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
  };
}
