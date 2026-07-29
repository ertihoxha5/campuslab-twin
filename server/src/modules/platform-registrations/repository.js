import { query } from "../../database/query.js";

const listColumns = `
  id, university_name AS universityName, acronym,
  institution_type AS institutionType, city,
  representative_name AS representativeName,
  representative_email AS representativeEmail,
  status, review_reason AS reviewReason,
  reviewed_at AS reviewedAt, created_at AS createdAt`;

export function createPlatformRegistrationRepository(pool) {
  return {
    async list({ status, search, limit, offset }) {
      const parameters = [];
      const filters = [];

      if (status) {
        filters.push("status = ?");
        parameters.push(status);
      }
      if (search) {
        filters.push(
          "(university_name LIKE ? OR acronym LIKE ? OR representative_email LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern);
      }

      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT ${listColumns}
           FROM university_registration_requests
           ${where}
           ORDER BY created_at DESC, id DESC
           LIMIT ? OFFSET ?`,
          [...parameters, limit, offset],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM university_registration_requests
           ${where}`,
          parameters,
        ),
      ]);

      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async findById(id) {
      const rows = await query(
        pool,
        `SELECT ${listColumns},
                address, official_website AS officialWebsite,
                description, representative_phone AS representativePhone,
                temporary_logo_path AS temporaryLogoPath,
                reviewed_by_platform_admin_id AS reviewedByPlatformAdminId,
                created_university_id AS createdUniversityId,
                updated_at AS updatedAt
         FROM university_registration_requests
         WHERE id = ?
         LIMIT 1`,
        [id],
      );

      return rows[0] ?? null;
    },
  };
}
