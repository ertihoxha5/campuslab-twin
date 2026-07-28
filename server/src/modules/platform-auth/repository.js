import { query, withTransaction } from "../../database/query.js";

function mapAdministrator(row) {
  return row
    ? {
        ...row,
        id: String(row.id),
      }
    : null;
}

export function createPlatformAuthRepository(pool) {
  return {
    async findByEmail(email) {
      const rows = await query(
        pool,
        `SELECT id, full_name AS fullName, email, password_hash AS passwordHash,
                status
         FROM platform_admins
         WHERE email = ?
         LIMIT 1`,
        [email],
      );
      return mapAdministrator(rows[0]);
    },

    async findActiveById(id) {
      const rows = await query(
        pool,
        `SELECT id, full_name AS fullName, email, password_hash AS passwordHash,
                status
         FROM platform_admins
         WHERE id = ?
         LIMIT 1`,
        [id],
      );
      return mapAdministrator(rows[0]);
    },

    async createSession({
      administrator,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        await query(
          connection,
          `INSERT INTO platform_refresh_tokens
             (platform_admin_id, token_hash, expires_at, user_agent, ip_address)
           VALUES (?, ?, ?, ?, ?)`,
          [administrator.id, tokenHash, expiresAt, userAgent, ipAddress],
        );
        await query(
          connection,
          `UPDATE platform_admins
           SET last_login_at = UTC_TIMESTAMP(3)
           WHERE id = ?`,
          [administrator.id],
        );
        await insertActivity(connection, {
          administratorId: administrator.id,
          action: "platform_auth.login",
          description: "Administratori i platformës u kyç me sukses.",
          ipAddress,
        });
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
          `SELECT id, platform_admin_id AS administratorId
           FROM platform_refresh_tokens
           WHERE token_hash = ? AND revoked_at IS NULL
             AND expires_at > UTC_TIMESTAMP(3)
           FOR UPDATE`,
          [tokenHash],
        );
        const current = rows[0];
        if (!current) return null;

        const admins = await query(
          connection,
          `SELECT id, full_name AS fullName, email,
                  password_hash AS passwordHash, status
           FROM platform_admins
           WHERE id = ?
           LIMIT 1`,
          [current.administratorId],
        );
        const administrator = mapAdministrator(admins[0]);

        if (!administrator || administrator.status !== "active") {
          await query(
            connection,
            `UPDATE platform_refresh_tokens
             SET revoked_at = UTC_TIMESTAMP(3)
             WHERE id = ?`,
            [current.id],
          );
          return administrator;
        }

        const inserted = await query(
          connection,
          `INSERT INTO platform_refresh_tokens
             (platform_admin_id, token_hash, expires_at, user_agent, ip_address)
           VALUES (?, ?, ?, ?, ?)`,
          [administrator.id, replacementHash, expiresAt, userAgent, ipAddress],
        );
        await query(
          connection,
          `UPDATE platform_refresh_tokens
           SET revoked_at = UTC_TIMESTAMP(3), replaced_by_token_id = ?
           WHERE id = ?`,
          [inserted.insertId, current.id],
        );
        return administrator;
      });
    },

    async revokeSession({ tokenHash, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT id, platform_admin_id AS administratorId
           FROM platform_refresh_tokens
           WHERE token_hash = ? AND revoked_at IS NULL
           FOR UPDATE`,
          [tokenHash],
        );
        const current = rows[0];
        if (!current) return;

        await query(
          connection,
          `UPDATE platform_refresh_tokens
           SET revoked_at = UTC_TIMESTAMP(3)
           WHERE id = ?`,
          [current.id],
        );
        await insertActivity(connection, {
          administratorId: current.administratorId,
          action: "platform_auth.logout",
          description: "Administratori i platformës doli nga sesioni.",
          ipAddress,
        });
      });
    },
  };
}

async function insertActivity(
  connection,
  { administratorId, action, description, ipAddress },
) {
  await query(
    connection,
    `INSERT INTO platform_activity_logs
       (platform_admin_id, action, entity_type, entity_id, description, ip_address)
     VALUES (?, ?, 'platform_admin', ?, ?, ?)`,
    [administratorId, action, administratorId, description, ipAddress],
  );
}
