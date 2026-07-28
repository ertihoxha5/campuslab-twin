import { query, withTransaction } from "../../database/query.js";

const userSelection = `
  SELECT
    u.id,
    u.university_id AS universityId,
    u.full_name AS fullName,
    u.email,
    u.password_hash AS passwordHash,
    u.status AS userStatus,
    un.name AS universityName,
    un.acronym AS universityAcronym,
    un.status AS universityStatus,
    GROUP_CONCAT(DISTINCT r.code ORDER BY r.code) AS roleCodes
  FROM users u
  INNER JOIN universities un ON un.id = u.university_id
  LEFT JOIN user_roles ur
    ON ur.user_id = u.id AND ur.university_id = u.university_id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

function mapUser(row) {
  if (!row) return null;

  return {
    ...row,
    id: String(row.id),
    universityId: String(row.universityId),
    roles: row.roleCodes ? row.roleCodes.split(",") : [],
  };
}

export function createAuthRepository(pool) {
  return {
    async findUsersByEmail(email) {
      const rows = await query(
        pool,
        `${userSelection}
         WHERE u.email = ? AND u.deleted_at IS NULL
         GROUP BY u.id, u.university_id, u.full_name, u.email, u.password_hash,
                  u.status, un.name, un.acronym, un.status`,
        [email],
      );
      return rows.map(mapUser);
    },

    async findActiveUserById(userId, universityId) {
      const rows = await query(
        pool,
        `${userSelection}
         WHERE u.id = ? AND u.university_id = ? AND u.deleted_at IS NULL
         GROUP BY u.id, u.university_id, u.full_name, u.email, u.password_hash,
                  u.status, un.name, un.acronym, un.status
         LIMIT 1`,
        [userId, universityId],
      );
      return mapUser(rows[0]);
    },

    async createSession({ user, tokenHash, expiresAt, userAgent, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          `INSERT INTO refresh_tokens
             (university_id, user_id, token_hash, expires_at, user_agent, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.universityId,
            user.id,
            tokenHash,
            expiresAt,
            userAgent,
            ipAddress,
          ],
        );

        await query(
          connection,
          "UPDATE users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ? AND university_id = ?",
          [user.id, user.universityId],
        );
        await insertActivity(connection, {
          user,
          action: "auth.login",
          description: "Përdoruesi u kyç me sukses.",
          ipAddress,
        });

        return String(result.insertId);
      });
    },

    async rotateSession({
      tokenHash,
      replacementHash,
      expiresAt,
      userAgent,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT id, university_id AS universityId, user_id AS userId
           FROM refresh_tokens
           WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
           FOR UPDATE`,
          [tokenHash],
        );
        const current = rows[0];
        if (!current) return null;

        const users = await query(
          connection,
          `${userSelection}
           WHERE u.id = ? AND u.university_id = ? AND u.deleted_at IS NULL
           GROUP BY u.id, u.university_id, u.full_name, u.email, u.password_hash,
                    u.status, un.name, un.acronym, un.status
           LIMIT 1`,
          [current.userId, current.universityId],
        );
        const user = mapUser(users[0]);
        if (!user) return null;

        if (
          user.userStatus !== "active" ||
          user.universityStatus !== "active"
        ) {
          await query(
            connection,
            "UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ?",
            [current.id],
          );
          return user;
        }

        const inserted = await query(
          connection,
          `INSERT INTO refresh_tokens
             (university_id, user_id, token_hash, expires_at, user_agent, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.universityId,
            user.id,
            replacementHash,
            expiresAt,
            userAgent,
            ipAddress,
          ],
        );
        await query(
          connection,
          `UPDATE refresh_tokens
           SET revoked_at = UTC_TIMESTAMP(3), replaced_by_token_id = ?
           WHERE id = ?`,
          [inserted.insertId, current.id],
        );

        return user;
      });
    },

    async revokeSession({ tokenHash, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT rt.id, rt.university_id AS universityId, rt.user_id AS userId
           FROM refresh_tokens rt
           WHERE rt.token_hash = ? AND rt.revoked_at IS NULL
           FOR UPDATE`,
          [tokenHash],
        );
        const current = rows[0];
        if (!current) return;

        await query(
          connection,
          "UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ?",
          [current.id],
        );
        await insertActivity(connection, {
          user: { id: current.userId, universityId: current.universityId },
          action: "auth.logout",
          description: "Përdoruesi doli nga sesioni.",
          ipAddress,
        });
      });
    },

    async createPasswordReset({ user, tokenHash, expiresAt, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        await query(
          connection,
          `UPDATE password_reset_tokens
           SET used_at = UTC_TIMESTAMP(3)
           WHERE university_id = ? AND user_id = ? AND used_at IS NULL`,
          [user.universityId, user.id],
        );
        await query(
          connection,
          `INSERT INTO password_reset_tokens
             (university_id, user_id, token_hash, expires_at, requested_ip_address)
           VALUES (?, ?, ?, ?, ?)`,
          [user.universityId, user.id, tokenHash, expiresAt, ipAddress],
        );
        await insertActivity(connection, {
          user,
          action: "auth.password_reset_requested",
          description: "U kërkua rikuperimi i fjalëkalimit.",
          ipAddress,
        });
      });
    },

    async consumePasswordReset({ tokenHash, passwordHash, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT
             prt.id,
             prt.university_id AS universityId,
             prt.user_id AS userId,
             u.status AS userStatus,
             un.status AS universityStatus
           FROM password_reset_tokens prt
           INNER JOIN users u
             ON u.id = prt.user_id AND u.university_id = prt.university_id
           INNER JOIN universities un ON un.id = prt.university_id
           WHERE prt.token_hash = ?
             AND prt.used_at IS NULL
             AND prt.expires_at > UTC_TIMESTAMP(3)
             AND u.deleted_at IS NULL
           FOR UPDATE`,
          [tokenHash],
        );
        const reset = rows[0];

        if (
          !reset ||
          reset.userStatus !== "active" ||
          reset.universityStatus !== "active"
        ) {
          return false;
        }

        await query(
          connection,
          `UPDATE users
           SET password_hash = ?, updated_at = UTC_TIMESTAMP(3)
           WHERE id = ? AND university_id = ?`,
          [passwordHash, reset.userId, reset.universityId],
        );
        await query(
          connection,
          "UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ?",
          [reset.id],
        );
        await query(
          connection,
          `UPDATE refresh_tokens
           SET revoked_at = UTC_TIMESTAMP(3)
           WHERE university_id = ? AND user_id = ? AND revoked_at IS NULL`,
          [reset.universityId, reset.userId],
        );
        await insertActivity(connection, {
          user: { id: reset.userId, universityId: reset.universityId },
          action: "auth.password_reset_completed",
          description: "Fjalëkalimi u ndryshua përmes rikuperimit.",
          ipAddress,
        });

        return true;
      });
    },
  };
}

async function insertActivity(
  connection,
  { user, action, description, ipAddress },
) {
  await query(
    connection,
    `INSERT INTO activity_logs
       (university_id, user_id, action, entity_type, entity_id, description, ip_address)
     VALUES (?, ?, ?, 'user', ?, ?, ?)`,
    [user.universityId, user.id, action, user.id, description, ipAddress],
  );
}
