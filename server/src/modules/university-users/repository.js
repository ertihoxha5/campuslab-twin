import { query } from "../../database/query.js";

const userSelect = `
  SELECT user.id, user.university_id AS universityId, user.full_name AS fullName,
         user.email, user.phone, user.job_title AS jobTitle, user.status,
         user.last_login_at AS lastLoginAt, user.created_at AS createdAt,
         GROUP_CONCAT(DISTINCT role.code ORDER BY role.code) AS roleCodes,
         GROUP_CONCAT(DISTINCT CONCAT(laboratory.id, '::', REPLACE(laboratory.name, ',', ' '))
                      ORDER BY laboratory.name SEPARATOR '||') AS laboratoryAssignments
    FROM users user
    LEFT JOIN user_roles userRole ON userRole.user_id = user.id
      AND userRole.university_id = user.university_id
    LEFT JOIN roles role ON role.id = userRole.role_id
    LEFT JOIN user_laboratory_assignments assignment ON assignment.user_id = user.id
      AND assignment.university_id = user.university_id
    LEFT JOIN laboratories laboratory ON laboratory.id = assignment.laboratory_id
      AND laboratory.university_id = user.university_id AND laboratory.deleted_at IS NULL`;

export function createUniversityUserRepository(pool) {
  return {
    async list(context) {
      const filters = ["user.university_id = ?", "user.deleted_at IS NULL"];
      const parameters = [context.universityId];
      if (context.status) {
        filters.push("user.status = ?");
        parameters.push(context.status);
      }
      if (context.search) {
        filters.push(
          "(user.full_name LIKE ? OR user.email LIKE ? OR user.job_title LIKE ?)",
        );
        const search = `%${context.search}%`;
        parameters.push(search, search, search);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const offset = (context.page - 1) * context.pageSize;
      const [users, totals] = await Promise.all([
        query(
          pool,
          `${userSelect} ${where}
           GROUP BY user.id, user.university_id, user.full_name, user.email,
                    user.phone, user.job_title, user.status, user.last_login_at,
                    user.created_at
           ORDER BY user.full_name, user.id LIMIT ? OFFSET ?`,
          [...parameters, context.pageSize, offset],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total FROM users user ${where}`,
          parameters,
        ),
      ]);
      return { users, total: Number(totals[0]?.total ?? 0) };
    },

    async options(universityId) {
      const [roles, laboratories] = await Promise.all([
        query(
          pool,
          `SELECT id, code, name_sq AS name, description_sq AS description
             FROM roles ORDER BY name_sq`,
        ),
        query(
          pool,
          `SELECT id, name, code FROM laboratories
            WHERE university_id = ? AND deleted_at IS NULL AND status <> 'archived'
            ORDER BY name`,
          [universityId],
        ),
      ]);
      return { roles, laboratories };
    },
  };
}
