import { query, withTransaction } from "../../database/query.js";

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

    async create(input) {
      return withTransaction(pool, async (connection) => {
        const rolePlaceholders = input.roles.map(() => "?").join(", ");
        const roles = await query(
          connection,
          `SELECT id, code FROM roles WHERE code IN (${rolePlaceholders})`,
          input.roles,
        );
        if (roles.length !== input.roles.length) return { invalidRoles: true };

        let laboratories = [];
        if (input.laboratoryIds.length) {
          const laboratoryPlaceholders = input.laboratoryIds
            .map(() => "?")
            .join(", ");
          laboratories = await query(
            connection,
            `SELECT id FROM laboratories
              WHERE university_id = ? AND id IN (${laboratoryPlaceholders})
                AND deleted_at IS NULL AND status <> 'archived'`,
            [input.universityId, ...input.laboratoryIds],
          );
          if (laboratories.length !== input.laboratoryIds.length)
            return { invalidLaboratories: true };
        }

        const inserted = await query(
          connection,
          `INSERT INTO users (
             university_id, full_name, email, password_hash, phone, job_title, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            input.universityId,
            input.fullName,
            input.email,
            input.passwordHash,
            input.phone,
            input.jobTitle,
            input.status,
          ],
        );
        const userId = String(inserted.insertId);
        for (const role of roles) {
          await query(
            connection,
            `INSERT INTO user_roles (university_id, user_id, role_id)
             VALUES (?, ?, ?)`,
            [input.universityId, userId, role.id],
          );
        }
        for (const laboratory of laboratories) {
          await query(
            connection,
            `INSERT INTO user_laboratory_assignments
               (university_id, user_id, laboratory_id)
             VALUES (?, ?, ?)`,
            [input.universityId, userId, laboratory.id],
          );
        }
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'university.user.created', 'user', ?, ?, ?, ?)`,
          [
            input.universityId,
            input.actorUserId,
            userId,
            "U krijua një përdorues i universitetit.",
            JSON.stringify({
              targetUserId: userId,
              roles: input.roles,
              laboratoryIds: input.laboratoryIds,
              status: input.status,
            }),
            input.ipAddress,
          ],
        );
        return {
          user: {
            id: userId,
            universityId: input.universityId,
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            jobTitle: input.jobTitle,
            status: input.status,
            roles: input.roles,
            laboratories: laboratories.map((laboratory) => ({
              id: String(laboratory.id),
            })),
          },
        };
      });
    },
  };
}
