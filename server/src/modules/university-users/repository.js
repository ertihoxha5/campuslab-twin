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
      const pageSize = Number(context.pageSize);
      const offset = (Number(context.page) - 1) * pageSize;
      if (!Number.isSafeInteger(pageSize) || !Number.isSafeInteger(offset)) {
        throw new TypeError("Pagination values must be safe integers.");
      }
      const [users, totals] = await Promise.all([
        query(
          pool,
          `${userSelect} ${where}
           GROUP BY user.id, user.university_id, user.full_name, user.email,
                    user.phone, user.job_title, user.status, user.last_login_at,
                    user.created_at
           ORDER BY user.full_name, user.id LIMIT ${pageSize} OFFSET ${offset}`,
          parameters,
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

    async detail({ universityId, userId }) {
      const users = await query(
        pool,
        `${userSelect}
         WHERE user.id = ? AND user.university_id = ? AND user.deleted_at IS NULL
         GROUP BY user.id, user.university_id, user.full_name, user.email,
                  user.phone, user.job_title, user.status, user.last_login_at,
                  user.created_at
         LIMIT 1`,
        [userId, universityId],
      );
      if (!users[0]) return null;
      const activity = await query(
        pool,
        `SELECT activity.id, activity.action, activity.description,
                activity.metadata_json AS metadata,
                COALESCE(actor.full_name, 'Sistemi') AS actorName,
                activity.created_at AS createdAt
           FROM activity_logs activity
           LEFT JOIN users actor ON actor.id = activity.user_id
             AND actor.university_id = activity.university_id
          WHERE activity.university_id = ?
            AND (activity.user_id = ? OR
                 (activity.entity_type = 'user' AND activity.entity_id = ?))
          ORDER BY activity.created_at DESC, activity.id DESC
          LIMIT 20`,
        [universityId, userId, userId],
      );
      return { user: users[0], activity };
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

    async update(input) {
      return withTransaction(pool, async (connection) => {
        const targets = await query(
          connection,
          `SELECT id FROM users
            WHERE id = ? AND university_id = ? AND deleted_at IS NULL
            FOR UPDATE`,
          [input.userId, input.universityId],
        );
        if (!targets[0]) return null;
        const relations = await validateRelations(connection, input);
        if (relations.invalidRoles || relations.invalidLaboratories)
          return relations;
        await query(
          connection,
          `UPDATE users SET full_name = ?, email = ?, phone = ?, job_title = ?
            WHERE id = ? AND university_id = ?`,
          [
            input.fullName,
            input.email,
            input.phone,
            input.jobTitle,
            input.userId,
            input.universityId,
          ],
        );
        await query(
          connection,
          "DELETE FROM user_roles WHERE user_id = ? AND university_id = ?",
          [input.userId, input.universityId],
        );
        await query(
          connection,
          "DELETE FROM user_laboratory_assignments WHERE user_id = ? AND university_id = ?",
          [input.userId, input.universityId],
        );
        await insertRelations(connection, input, relations);
        await insertAudit(
          connection,
          input,
          "university.user.updated",
          "U përditësua përdoruesi i universitetit.",
        );
        return { user: responseUser(input, relations.laboratories) };
      });
    },

    async setStatus(input) {
      return withTransaction(pool, async (connection) => {
        const targets = await query(
          connection,
          `SELECT id, status FROM users
            WHERE id = ? AND university_id = ? AND deleted_at IS NULL
            FOR UPDATE`,
          [input.userId, input.universityId],
        );
        if (!targets[0]) return null;
        await query(
          connection,
          "UPDATE users SET status = ? WHERE id = ? AND university_id = ?",
          [input.status, input.userId, input.universityId],
        );
        if (input.status === "inactive") {
          await query(
            connection,
            `UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3)
              WHERE user_id = ? AND university_id = ? AND revoked_at IS NULL`,
            [input.userId, input.universityId],
          );
        }
        await insertAudit(
          connection,
          { ...input, roles: undefined, laboratoryIds: undefined },
          input.status === "active"
            ? "university.user.reactivated"
            : "university.user.deactivated",
          input.status === "active"
            ? "U riaktivizua përdoruesi i universitetit."
            : "U çaktivizua përdoruesi i universitetit.",
        );
        return { id: input.userId, status: input.status };
      });
    },
  };
}

async function validateRelations(connection, input) {
  const roles = await query(
    connection,
    `SELECT id, code FROM roles WHERE code IN (${input.roles.map(() => "?").join(", ")})`,
    input.roles,
  );
  if (roles.length !== input.roles.length) return { invalidRoles: true };
  let laboratories = [];
  if (input.laboratoryIds.length) {
    laboratories = await query(
      connection,
      `SELECT id FROM laboratories WHERE university_id = ?
        AND id IN (${input.laboratoryIds.map(() => "?").join(", ")})
        AND deleted_at IS NULL AND status <> 'archived'`,
      [input.universityId, ...input.laboratoryIds],
    );
    if (laboratories.length !== input.laboratoryIds.length)
      return { invalidLaboratories: true };
  }
  return { roles, laboratories };
}

async function insertRelations(connection, input, relations) {
  for (const role of relations.roles) {
    await query(
      connection,
      "INSERT INTO user_roles (university_id, user_id, role_id) VALUES (?, ?, ?)",
      [input.universityId, input.userId, role.id],
    );
  }
  for (const laboratory of relations.laboratories) {
    await query(
      connection,
      "INSERT INTO user_laboratory_assignments (university_id, user_id, laboratory_id) VALUES (?, ?, ?)",
      [input.universityId, input.userId, laboratory.id],
    );
  }
}

async function insertAudit(connection, input, action, description) {
  await query(
    connection,
    `INSERT INTO activity_logs (university_id, user_id, action, entity_type,
       entity_id, description, metadata_json, ip_address)
     VALUES (?, ?, ?, 'user', ?, ?, ?, ?)`,
    [
      input.universityId,
      input.actorUserId,
      input.userId,
      action,
      description,
      JSON.stringify({
        targetUserId: input.userId,
        roles: input.roles,
        laboratoryIds: input.laboratoryIds,
        status: input.status,
      }),
      input.ipAddress,
    ],
  );
}

function responseUser(input, laboratories) {
  return {
    id: input.userId,
    universityId: input.universityId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    jobTitle: input.jobTitle,
    roles: input.roles,
    laboratories: laboratories.map(({ id }) => ({ id: String(id) })),
  };
}
