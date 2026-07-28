import { query } from "../../database/query.js";

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

    async create(registration) {
      const result = await query(
        pool,
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

      return { id: result.insertId };
    },
  };
}
