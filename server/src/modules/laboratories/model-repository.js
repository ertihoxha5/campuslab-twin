import { query, withTransaction } from "../../database/query.js";

export function createLaboratoryModelRepository(pool) {
  return {
    async attach({
      universityId,
      laboratoryId,
      userId,
      ipAddress,
      file,
    }) {
      return withTransaction(pool, async (connection) => {
        const laboratories = await query(
          connection,
          `SELECT id, name
           FROM laboratories
           WHERE university_id = ? AND id = ? AND deleted_at IS NULL
           FOR UPDATE`,
          [universityId, laboratoryId],
        );
        if (!laboratories[0]) return null;

        const result = await query(
          connection,
          `INSERT INTO stored_files (
             university_id, uploaded_by_user_id, category, original_name,
             stored_name, relative_path, mime_type, size_bytes,
             checksum_sha256, related_entity_type, related_entity_id
           ) VALUES (?, ?, 'model_3d', ?, ?, ?, ?, ?, ?, 'laboratory', ?)`,
          [
            universityId,
            userId,
            file.originalName,
            file.storedName,
            file.relativePath,
            file.mimeType,
            file.sizeBytes,
            file.checksumSha256,
            laboratoryId,
          ],
        );
        const fileId = result.insertId;
        await query(
          connection,
          `UPDATE laboratories
           SET model_file_id = ?
           WHERE university_id = ? AND id = ? AND deleted_at IS NULL`,
          [fileId, universityId, laboratoryId],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.model_uploaded', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U ngarkua modeli 3D për laboratorin ${laboratories[0].name}.`,
            JSON.stringify({
              fileId,
              originalName: file.originalName,
              sizeBytes: file.sizeBytes,
            }),
            ipAddress,
          ],
        );
        return {
          id: String(fileId),
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          createdAt: new Date().toISOString(),
        };
      });
    },

    async findCurrent({ universityId, laboratoryId }) {
      const rows = await query(
        pool,
        `SELECT file.id, file.original_name AS originalName,
                file.relative_path AS relativePath,
                file.mime_type AS mimeType, file.size_bytes AS sizeBytes,
                file.created_at AS createdAt
         FROM laboratories laboratory
         INNER JOIN stored_files file
           ON file.id = laboratory.model_file_id
          AND file.university_id = laboratory.university_id
          AND file.category = 'model_3d'
         WHERE laboratory.university_id = ?
           AND laboratory.id = ?
           AND laboratory.deleted_at IS NULL
         LIMIT 1`,
        [universityId, laboratoryId],
      );
      return rows[0] ?? null;
    },

    async detach({ universityId, laboratoryId, userId, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT laboratory.id, laboratory.name,
                  file.id AS fileId, file.original_name AS originalName
           FROM laboratories laboratory
           LEFT JOIN stored_files file
             ON file.id = laboratory.model_file_id
            AND file.university_id = laboratory.university_id
           WHERE laboratory.university_id = ?
             AND laboratory.id = ?
             AND laboratory.deleted_at IS NULL
           FOR UPDATE`,
          [universityId, laboratoryId],
        );
        const laboratory = rows[0];
        if (!laboratory?.fileId) return null;
        await query(
          connection,
          `UPDATE laboratories
           SET model_file_id = NULL
           WHERE university_id = ? AND id = ?`,
          [universityId, laboratoryId],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'laboratory.model_detached', 'laboratory', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            laboratoryId,
            `U hoq modeli 3D nga laboratori ${laboratory.name}.`,
            JSON.stringify({
              fileId: laboratory.fileId,
              originalName: laboratory.originalName,
            }),
            ipAddress,
          ],
        );
        return {
          id: String(laboratory.fileId),
          originalName: laboratory.originalName,
        };
      });
    },
  };
}
