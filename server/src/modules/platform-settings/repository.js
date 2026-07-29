import { query, withTransaction } from "../../database/query.js";

function mapSettings(row = {}) {
  return {
    registrationsOpen: Boolean(row.registrationsOpen),
    requireWebsiteDomainMatch: Boolean(row.requireWebsiteDomainMatch),
    allowPublicEmailProviders: Boolean(row.allowPublicEmailProviders),
    updatedAt: row.updatedAt ?? null,
  };
}

export function createPlatformSettingsRepository(pool) {
  const repository = {
    async get() {
      const settings = await query(
        pool,
        `SELECT registrations_open AS registrationsOpen,
                require_website_domain_match AS requireWebsiteDomainMatch,
                allow_public_email_providers AS allowPublicEmailProviders,
                updated_at AS updatedAt
         FROM platform_registration_settings WHERE id = 1`,
      );
      const exceptions = await query(
        pool,
        `SELECT id, email_domain AS emailDomain,
                website_domain AS websiteDomain, reason,
                created_at AS createdAt
         FROM institutional_email_exceptions
         ORDER BY email_domain, website_domain`,
      );
      return { settings: mapSettings(settings[0]), exceptions };
    },

    async update(settings, context) {
      return withTransaction(pool, async (connection) => {
        await query(
          connection,
          `UPDATE platform_registration_settings
           SET registrations_open = ?, require_website_domain_match = ?,
               allow_public_email_providers = ?,
               updated_by_platform_admin_id = ?
           WHERE id = 1`,
          [
            settings.registrationsOpen,
            settings.requireWebsiteDomainMatch,
            settings.allowPublicEmailProviders,
            context.platformAdminId,
          ],
        );
        await query(
          connection,
          `INSERT INTO platform_activity_logs (
             platform_admin_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, 'platform.registration_settings.updated',
             'platform_registration_settings', 1, ?, ?, ?)`,
          [
            context.platformAdminId,
            "Rregullat e regjistrimit u përditësuan.",
            JSON.stringify(settings),
            context.ipAddress,
          ],
        );
        return settings;
      });
    },

    async addException(exception, context) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          `INSERT INTO institutional_email_exceptions (
             email_domain, website_domain, reason, created_by_platform_admin_id
           ) VALUES (?, ?, ?, ?)`,
          [
            exception.emailDomain,
            exception.websiteDomain,
            exception.reason,
            context.platformAdminId,
          ],
        );
        await query(
          connection,
          `INSERT INTO platform_activity_logs (
             platform_admin_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, 'platform.email_exception.created',
             'institutional_email_exception', ?, ?, ?, ?)`,
          [
            context.platformAdminId,
            result.insertId,
            "U shtua një përjashtim për email institucional.",
            JSON.stringify(exception),
            context.ipAddress,
          ],
        );
        return { id: String(result.insertId), ...exception };
      });
    },

    async removeException(id, context) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          "DELETE FROM institutional_email_exceptions WHERE id = ?",
          [id],
        );
        if (!result.affectedRows) return false;
        await query(
          connection,
          `INSERT INTO platform_activity_logs (
             platform_admin_id, action, entity_type, entity_id,
             description, ip_address
           ) VALUES (?, 'platform.email_exception.deleted',
             'institutional_email_exception', ?, ?, ?)`,
          [
            context.platformAdminId,
            id,
            "U hoq një përjashtim për email institucional.",
            context.ipAddress,
          ],
        );
        return true;
      });
    },
  };
  repository.getRegistrationPolicy = async () => {
    const result = await repository.get();
    return { ...result.settings, exceptions: result.exceptions };
  };
  return repository;
}
