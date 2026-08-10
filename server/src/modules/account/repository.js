import { query, withTransaction } from "../../database/query.js";

export function createAccountRepository(pool) {
  return {
    async get({ universityId, userId }) {
      const rows = await query(
        pool,
        `SELECT id, full_name AS fullName, email, phone,
                job_title AS jobTitle, password_hash AS passwordHash,
                last_login_at AS lastLoginAt, created_at AS createdAt
           FROM users
          WHERE id = ? AND university_id = ? AND status = 'active'
            AND deleted_at IS NULL
          LIMIT 1`,
        [userId, universityId],
      );
      return rows[0] ?? null;
    },

    async updateProfile(input) {
      return withTransaction(pool, async (connection) => {
        await query(
          connection,
          `UPDATE users SET full_name = ?, email = ?, phone = ?, job_title = ?,
                            updated_at = UTC_TIMESTAMP(3)
            WHERE id = ? AND university_id = ? AND status = 'active'
              AND deleted_at IS NULL`,
          [
            input.fullName,
            input.email,
            input.phone,
            input.jobTitle,
            input.userId,
            input.universityId,
          ],
        );
        await audit(
          connection,
          input,
          "account.profile.updated",
          "Përdoruesi përditësoi profilin personal.",
        );
        const rows = await query(
          connection,
          `SELECT id, full_name AS fullName, email, phone,
                  job_title AS jobTitle, last_login_at AS lastLoginAt,
                  created_at AS createdAt
             FROM users WHERE id = ? AND university_id = ? LIMIT 1`,
          [input.userId, input.universityId],
        );
        return rows[0] ?? null;
      });
    },

    async updatePassword(input) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT password_hash AS passwordHash FROM users
            WHERE id = ? AND university_id = ? AND status = 'active'
              AND deleted_at IS NULL FOR UPDATE`,
          [input.userId, input.universityId],
        );
        if (!rows[0]) return null;
        await query(
          connection,
          `UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP(3)
            WHERE id = ? AND university_id = ?`,
          [input.passwordHash, input.userId, input.universityId],
        );
        await query(
          connection,
          `UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3)
            WHERE user_id = ? AND university_id = ? AND revoked_at IS NULL`,
          [input.userId, input.universityId],
        );
        await audit(
          connection,
          input,
          "account.password.changed",
          "Përdoruesi ndryshoi fjalëkalimin dhe sesionet aktive u mbyllën.",
        );
        return rows[0];
      });
    },
  };
}

async function audit(connection, input, action, description) {
  await query(
    connection,
    `INSERT INTO activity_logs
       (university_id, user_id, action, entity_type, entity_id, description, ip_address)
     VALUES (?, ?, ?, 'user', ?, ?, ?)`,
    [
      input.universityId,
      input.userId,
      action,
      input.userId,
      description,
      input.ipAddress,
    ],
  );
}
