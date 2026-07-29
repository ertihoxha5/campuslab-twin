import { query, withTransaction } from "../../database/query.js";

const listScope = (archivedOnly) => `
  laboratory.university_id = ?
  AND laboratory.deleted_at IS ${archivedOnly ? "NOT NULL" : "NULL"}
  AND (? = 0 OR EXISTS (
    SELECT 1
    FROM user_laboratory_assignments assignment
    WHERE assignment.university_id = laboratory.university_id
      AND assignment.laboratory_id = laboratory.id
      AND assignment.user_id = ?
  ))
`;

export function createLaboratoryRepository(pool) {
  return {
    async listResponsibleUsers({ universityId }) {
      return query(
        pool,
        `SELECT user.id, user.full_name AS fullName, user.email,
                user.job_title AS jobTitle,
                GROUP_CONCAT(DISTINCT role.code ORDER BY role.code) AS roleCodes
         FROM users user
         INNER JOIN user_roles assignment
           ON assignment.user_id = user.id
          AND assignment.university_id = user.university_id
         INNER JOIN roles role
           ON role.id = assignment.role_id
          AND role.code IN ('university_admin', 'lab_manager')
         WHERE user.university_id = ?
           AND user.status = 'active'
           AND user.deleted_at IS NULL
         GROUP BY user.id, user.full_name, user.email, user.job_title
         ORDER BY user.full_name, user.id`,
        [universityId],
      );
    },

    async list({
      universityId,
      userId,
      restrictToAssignments,
      search,
      status,
      archivedOnly = false,
      limit,
      offset,
    }) {
      const filters = [listScope(archivedOnly)];
      const parameters = [universityId, restrictToAssignments ? 1 : 0, userId];
      if (status) {
        filters.push("laboratory.status = ?");
        parameters.push(status);
      }
      if (search) {
        filters.push(
          "(laboratory.name LIKE ? OR laboratory.code LIKE ? OR laboratory.faculty LIKE ? OR laboratory.building LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern, pattern);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT id, name, code, faculty, building, floor, capacity,
                  status, description, responsibleUserId,
                  responsibleUserName, createdAt, updatedAt
           FROM (
             SELECT laboratory.id, laboratory.name, laboratory.code,
                    laboratory.faculty, laboratory.building, laboratory.floor,
                    laboratory.capacity, laboratory.status,
                    laboratory.description,
                    laboratory.responsible_user_id AS responsibleUserId,
                    responsible.full_name AS responsibleUserName,
                    laboratory.created_at AS createdAt,
                    laboratory.updated_at AS updatedAt,
                    laboratory.deleted_at AS deletedAt,
                    ROW_NUMBER() OVER (
                      ORDER BY laboratory.name, laboratory.id
                    ) AS rowNumber
             FROM laboratories laboratory
             LEFT JOIN users responsible
               ON responsible.id = laboratory.responsible_user_id
              AND responsible.university_id = laboratory.university_id
             ${where}
           ) ranked
           WHERE rowNumber > ? AND rowNumber <= ?
           ORDER BY rowNumber`,
          [...parameters, offset, offset + limit],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM laboratories laboratory
           ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async findById({ universityId, laboratoryId }) {
      const rows = await query(
        pool,
        `SELECT laboratory.id, laboratory.name, laboratory.code,
                laboratory.faculty, laboratory.building, laboratory.floor,
                laboratory.capacity, laboratory.status,
                laboratory.description,
                laboratory.responsible_user_id AS responsibleUserId,
                responsible.full_name AS responsibleUserName,
                model.id AS modelFileId,
                model.original_name AS modelOriginalName,
                model.mime_type AS modelMimeType,
                model.size_bytes AS modelSizeBytes,
                model.created_at AS modelCreatedAt,
                COUNT(DISTINCT zone.id) AS zoneCount,
                COUNT(DISTINCT equipment.id) AS equipmentCount,
                COUNT(DISTINCT sensor.id) AS sensorCount,
                laboratory.created_at AS createdAt,
                laboratory.updated_at AS updatedAt
         FROM laboratories laboratory
         LEFT JOIN users responsible
           ON responsible.id = laboratory.responsible_user_id
          AND responsible.university_id = laboratory.university_id
         LEFT JOIN stored_files model
           ON model.id = laboratory.model_file_id
          AND model.university_id = laboratory.university_id
          AND model.category = 'model_3d'
         LEFT JOIN laboratory_zones zone
           ON zone.laboratory_id = laboratory.id
          AND zone.university_id = laboratory.university_id
         LEFT JOIN equipment
           ON equipment.laboratory_id = laboratory.id
          AND equipment.university_id = laboratory.university_id
          AND equipment.deleted_at IS NULL
         LEFT JOIN sensors sensor
           ON sensor.laboratory_id = laboratory.id
          AND sensor.university_id = laboratory.university_id
          AND sensor.deleted_at IS NULL
         WHERE laboratory.university_id = ?
           AND laboratory.id = ?
           AND laboratory.deleted_at IS NULL
         GROUP BY laboratory.id
         LIMIT 1`,
        [universityId, laboratoryId],
      );
      return rows[0] ?? null;
    },

    async create({ universityId, userId, ipAddress, laboratory }) {
      return withTransaction(pool, async (connection) => {
        if (laboratory.responsibleUserId) {
          const responsibleUsers = await findEligibleResponsibleUser(
            connection,
            universityId,
            laboratory.responsibleUserId,
          );
          if (!responsibleUsers[0]) return { invalidResponsibleUser: true };
        }

        const result = await query(
          connection,
          `INSERT INTO laboratories (
             university_id, name, code, faculty, building, floor, capacity,
             responsible_user_id, description, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            laboratory.name,
            laboratory.code,
            laboratory.faculty,
            laboratory.building,
            laboratory.floor,
            laboratory.capacity,
            laboratory.responsibleUserId,
            laboratory.description,
            laboratory.status,
          ],
        );
        const laboratoryId = result.insertId;

        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.created', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U krijua laboratori ${laboratory.name}.`,
            JSON.stringify({ code: laboratory.code }),
            ipAddress,
          ],
        );
        if (laboratory.responsibleUserId) {
          await writeResponsibleAssignmentAudit(connection, {
            universityId,
            userId,
            laboratoryId,
            laboratoryName: laboratory.name,
            responsibleUserId: laboratory.responsibleUserId,
            ipAddress,
          });
        }

        return {
          id: String(laboratoryId),
          ...laboratory,
        };
      });
    },

    async update({
      universityId,
      laboratoryId,
      userId,
      ipAddress,
      laboratory,
    }) {
      return withTransaction(pool, async (connection) => {
        if (laboratory.responsibleUserId) {
          const responsibleUsers = await findEligibleResponsibleUser(
            connection,
            universityId,
            laboratory.responsibleUserId,
          );
          if (!responsibleUsers[0]) return { invalidResponsibleUser: true };
        }

        const result = await query(
          connection,
          `UPDATE laboratories
           SET name = ?, code = ?, faculty = ?, building = ?, floor = ?,
               capacity = ?, responsible_user_id = ?, description = ?,
               status = ?
           WHERE university_id = ?
             AND id = ?
             AND deleted_at IS NULL`,
          [
            laboratory.name,
            laboratory.code,
            laboratory.faculty,
            laboratory.building,
            laboratory.floor,
            laboratory.capacity,
            laboratory.responsibleUserId,
            laboratory.description,
            laboratory.status,
            universityId,
            laboratoryId,
          ],
        );
        if (!result.affectedRows) return null;

        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.updated', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U përditësua laboratori ${laboratory.name}.`,
            JSON.stringify({
              code: laboratory.code,
              status: laboratory.status,
            }),
            ipAddress,
          ],
        );
        if (laboratory.responsibleUserId) {
          await writeResponsibleAssignmentAudit(connection, {
            universityId,
            userId,
            laboratoryId,
            laboratoryName: laboratory.name,
            responsibleUserId: laboratory.responsibleUserId,
            ipAddress,
          });
        }
        return { id: String(laboratoryId), ...laboratory };
      });
    },

    async archive({ universityId, laboratoryId, userId, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const laboratories = await query(
          connection,
          `SELECT id, name, code
           FROM laboratories
           WHERE university_id = ?
             AND id = ?
             AND deleted_at IS NULL
           FOR UPDATE`,
          [universityId, laboratoryId],
        );
        const laboratory = laboratories[0];
        if (!laboratory) return null;

        await query(
          connection,
          `UPDATE laboratories
           SET status = 'archived', deleted_at = UTC_TIMESTAMP(3)
           WHERE university_id = ? AND id = ?`,
          [universityId, laboratoryId],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.archived', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U arkivua laboratori ${laboratory.name}.`,
            JSON.stringify({ code: laboratory.code }),
            ipAddress,
          ],
        );
        return { id: String(laboratory.id), name: laboratory.name };
      });
    },

    async restore({ universityId, laboratoryId, userId, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const laboratories = await query(
          connection,
          `SELECT id, name, code
           FROM laboratories
           WHERE university_id = ?
             AND id = ?
             AND deleted_at IS NOT NULL
           FOR UPDATE`,
          [universityId, laboratoryId],
        );
        const laboratory = laboratories[0];
        if (!laboratory) return null;

        await query(
          connection,
          `UPDATE laboratories
           SET status = 'active', deleted_at = NULL
           WHERE university_id = ? AND id = ? AND deleted_at IS NOT NULL`,
          [universityId, laboratoryId],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.restored', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U rikthye laboratori ${laboratory.name}.`,
            JSON.stringify({ code: laboratory.code }),
            ipAddress,
          ],
        );
        return {
          id: String(laboratory.id),
          name: laboratory.name,
          status: "active",
        };
      });
    },
  };
}

function findEligibleResponsibleUser(connection, universityId, userId) {
  return query(
    connection,
    `SELECT user.id
     FROM users user
     INNER JOIN user_roles assignment
       ON assignment.user_id = user.id
      AND assignment.university_id = user.university_id
     INNER JOIN roles role
       ON role.id = assignment.role_id
      AND role.code IN ('university_admin', 'lab_manager')
     WHERE user.university_id = ?
       AND user.id = ?
       AND user.status = 'active'
       AND user.deleted_at IS NULL
     LIMIT 1`,
    [universityId, userId],
  );
}

function writeResponsibleAssignmentAudit(
  connection,
  {
    universityId,
    userId,
    laboratoryId,
    laboratoryName,
    responsibleUserId,
    ipAddress,
  },
) {
  return query(
    connection,
    `INSERT INTO activity_logs (
       university_id, user_id, action, entity_type, entity_id,
       description, metadata_json, ip_address
     ) VALUES (?, ?, 'laboratory.responsible_assigned', 'laboratory', ?, ?, ?, ?)`,
    [
      universityId,
      userId,
      laboratoryId,
      `U caktua përgjegjësi i laboratorit ${laboratoryName}.`,
      JSON.stringify({ responsibleUserId }),
      ipAddress,
    ],
  );
}
