import { query, withTransaction } from "../../database/query.js";

export function createRegistrationRepository(pool) {
  return {
    async findConflict({ email, acronym, website }) {
      const rows = await query(
        pool,
        `SELECT conflict_type
           FROM (
             SELECT 'registration' AS conflict_type
               FROM university_registration_requests
              WHERE status = 'pending'
                AND (
                  representative_email = ?
                  OR acronym = ?
                  OR official_website = ?
                )
             UNION ALL
             SELECT 'university' AS conflict_type
               FROM universities
              WHERE representative_email = ?
                 OR acronym = ?
                 OR official_website = ?
           ) conflicts
          LIMIT 1`,
        [email, acronym, website, email, acronym, website],
      );
      return rows[0] ?? null;
    },

    async create(registration, context = {}) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          `INSERT INTO university_registration_requests (
             university_name, acronym, institution_type, city, address,
             official_website, description, representative_name,
             representative_email, representative_phone, password_hash,
             temporary_logo_path, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            registration.universityName,
            registration.acronym,
            registration.institutionType,
            registration.city,
            registration.address,
            registration.officialWebsite,
            registration.description || null,
            registration.representativeName,
            registration.representativeEmail,
            registration.representativePhone || null,
            registration.passwordHash,
            registration.logoPath,
          ],
        );
        await query(
          connection,
          `INSERT INTO platform_activity_logs
             (action, entity_type, entity_id, description, metadata_json, ip_address)
           VALUES (
             'university_registration.submitted',
             'university_registration_request',
             ?,
             'U dorëzua një kërkesë e re për regjistrim universiteti.',
             JSON_OBJECT('acronym', ?),
             ?
           )`,
          [result.insertId, registration.acronym, context.ipAddress ?? null],
        );

        return { id: result.insertId };
      });
    },
  };
}
