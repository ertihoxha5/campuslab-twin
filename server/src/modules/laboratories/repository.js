import { query, withTransaction } from "../../database/query.js";

const listScope = `
  laboratory.university_id = ?
  AND laboratory.deleted_at IS NULL
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
    async list({
      universityId,
      userId,
      restrictToAssignments,
      search,
      status,
      limit,
      offset,
    }) {
      const filters = [listScope];
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

    async create({ universityId, userId, ipAddress, laboratory }) {
      return withTransaction(pool, async (connection) => {
        if (laboratory.responsibleUserId) {
          const responsibleUsers = await query(
            connection,
            `SELECT id
             FROM users
             WHERE university_id = ?
               AND id = ?
               AND status = 'active'
               AND deleted_at IS NULL`,
            [universityId, laboratory.responsibleUserId],
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

        return {
          id: String(laboratoryId),
          ...laboratory,
        };
      });
    },
  };
}
