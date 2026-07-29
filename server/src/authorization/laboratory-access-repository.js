import { query } from "../database/query.js";

export function createLaboratoryAccessRepository(pool) {
  return {
    async findAccessibleLaboratory({
      universityId,
      userId,
      laboratoryId,
      requiresAssignment,
    }) {
      const rows = requiresAssignment
        ? await query(
            pool,
            `SELECT laboratory.id
             FROM laboratories laboratory
             INNER JOIN user_laboratory_assignments assignment
               ON assignment.laboratory_id = laboratory.id
              AND assignment.university_id = laboratory.university_id
             WHERE laboratory.university_id = ?
               AND laboratory.id = ?
               AND assignment.user_id = ?
               AND laboratory.deleted_at IS NULL
             LIMIT 1`,
            [universityId, laboratoryId, userId],
          )
        : await query(
            pool,
            `SELECT laboratory.id
             FROM laboratories laboratory
             WHERE laboratory.university_id = ?
               AND laboratory.id = ?
               AND laboratory.deleted_at IS NULL
             LIMIT 1`,
            [universityId, laboratoryId],
          );

      return rows[0] ?? null;
    },

    async listAccessibleLaboratoryIds({
      universityId,
      userId,
      requiresAssignment,
    }) {
      const rows = requiresAssignment
        ? await query(
            pool,
            `SELECT laboratory_id AS laboratoryId
             FROM user_laboratory_assignments
             WHERE university_id = ? AND user_id = ?
             ORDER BY laboratory_id`,
            [universityId, userId],
          )
        : await query(
            pool,
            `SELECT id AS laboratoryId
             FROM laboratories
             WHERE university_id = ? AND deleted_at IS NULL
             ORDER BY id`,
            [universityId],
          );

      return rows.map((row) => String(row.laboratoryId));
    },
  };
}
