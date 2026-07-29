import { query } from "../../database/query.js";

export function createFileRepository(pool) {
  return {
    async findById({ universityId, fileId }) {
      const rows = await query(
        pool,
        `SELECT id,
                university_id AS universityId,
                original_name AS originalName,
                relative_path AS relativePath,
                mime_type AS mimeType,
                size_bytes AS sizeBytes,
                category
         FROM stored_files
         WHERE university_id = ? AND id = ?
         LIMIT 1`,
        [universityId, fileId],
      );

      return rows[0] ?? null;
    },
  };
}
