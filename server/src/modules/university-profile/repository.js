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

    async attachLogo(input) {
      return withTransaction(pool, async (connection) => {
        const universities = await query(
          connection,
          "SELECT id FROM universities WHERE id = ? FOR UPDATE",
          [input.universityId],
        );
        if (!universities[0]) return null;
        const inserted = await query(
          connection,
          `INSERT INTO stored_files (
             university_id, uploaded_by_user_id, category, original_name,
             stored_name, relative_path, mime_type, size_bytes, checksum_sha256,
             related_entity_type, related_entity_id
           ) VALUES (?, ?, 'university_logo', ?, ?, ?, ?, ?, ?, 'university', ?)`,
          [
            input.universityId,
            input.userId,
            input.file.originalName,
            input.file.storedName,
            input.file.relativePath,
            input.file.mimeType,
            input.file.sizeBytes,
            input.file.checksumSha256,
            input.universityId,
          ],
        );
        const fileId = String(inserted.insertId);
        await query(
          connection,
          "UPDATE universities SET logo_file_id = ? WHERE id = ?",
          [fileId, input.universityId],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (university_id, user_id, action, entity_type,
             entity_id, description, metadata_json, ip_address)
           VALUES (?, ?, 'university.logo.updated', 'university', ?, ?, ?, ?)`,
          [
            input.universityId,
            input.userId,
            input.universityId,
            "U përditësua logoja e universitetit.",
            JSON.stringify({
              fileId,
              originalName: input.file.originalName,
              sizeBytes: input.file.sizeBytes,
            }),
            input.ipAddress,
          ],
        );
        return {
          id: fileId,
          originalName: input.file.originalName,
          mimeType: input.file.mimeType,
          sizeBytes: input.file.sizeBytes,
        };
      });
    },
  };
}
