import { query, withTransaction } from "../../database/query.js";

const selectProfile = `
  SELECT id, name, acronym, institution_type AS institutionType, status,
         city, address, official_website AS officialWebsite, description,
         representative_name AS representativeName,
         representative_email AS representativeEmail,
         logo_file_id AS logoFileId, updated_at AS updatedAt
    FROM universities`;

export function createUniversityProfileRepository(pool) {
  return {
    async get(universityId) {
      const rows = await query(pool, `${selectProfile} WHERE id = ? LIMIT 1`, [
        universityId,
      ]);
      return rows[0] ?? null;
    },

    async update(input) {
      return withTransaction(pool, async (connection) => {
        const current = await query(
          connection,
          "SELECT id FROM universities WHERE id = ? FOR UPDATE",
          [input.universityId],
        );
        if (!current[0]) return null;
        await query(
          connection,
          `UPDATE universities SET name = ?, acronym = ?, institution_type = ?,
             city = ?, address = ?, official_website = ?, description = ?,
             representative_name = ?, representative_email = ?
           WHERE id = ?`,
          [
            input.name,
            input.acronym,
            input.institutionType,
            input.city,
            input.address,
            input.officialWebsite,
            input.description,
            input.representativeName,
            input.representativeEmail,
            input.universityId,
          ],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'university.profile.updated', 'university', ?, ?, ?, ?)`,
          [
            input.universityId,
            input.userId,
            input.universityId,
            "U përditësua profili i universitetit.",
            JSON.stringify({
              name: input.name,
              acronym: input.acronym,
              institutionType: input.institutionType,
              city: input.city,
            }),
            input.ipAddress,
          ],
        );
        const rows = await query(
          connection,
          `${selectProfile} WHERE id = ? LIMIT 1`,
          [input.universityId],
        );
        return rows[0] ?? null;
      });
    },
  };
}
