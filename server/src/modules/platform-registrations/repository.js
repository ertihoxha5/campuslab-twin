import { query, withTransaction } from "../../database/query.js";

const listColumns = `
  id, university_name AS universityName, acronym,
  institution_type AS institutionType, city,
  representative_name AS representativeName,
  representative_email AS representativeEmail,
  status, review_reason AS reviewReason,
  reviewed_at AS reviewedAt, created_at AS createdAt`;
const listAliases = `
  id, universityName, acronym, institutionType, city,
  representativeName, representativeEmail, status, reviewReason,
  reviewedAt, createdAt`;

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
          `SELECT ${listAliases}
           FROM (
             SELECT ${listColumns},
                    ROW_NUMBER() OVER (
                      ORDER BY created_at DESC, id DESC
                    ) AS rowNumber
             FROM university_registration_requests
             ${where}
           ) ranked
           WHERE rowNumber > ? AND rowNumber <= ?
           ORDER BY rowNumber`,
          [...parameters, offset, offset + limit],
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

    async review({ requestId, platformAdminId, decision, reason, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT id, university_name AS universityName, acronym,
                  institution_type AS institutionType, city, address,
                  official_website AS officialWebsite, description,
                  representative_name AS representativeName,
                  representative_email AS representativeEmail,
                  representative_phone AS representativePhone,
                  password_hash AS passwordHash, status
           FROM university_registration_requests
           WHERE id = ?
           FOR UPDATE`,
          [requestId],
        );
        const registration = rows[0];
        if (!registration) return null;
        if (registration.status !== "pending") {
          return { alreadyReviewed: true, status: registration.status };
        }

        let universityId = null;
        if (decision === "approved") {
          const university = await query(
            connection,
            `INSERT INTO universities (
               name, acronym, institution_type, status, city, address,
               official_website, description, representative_name,
               representative_email, approved_at
             ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
            [
              registration.universityName,
              registration.acronym,
              registration.institutionType,
              registration.city,
              registration.address,
              registration.officialWebsite,
              registration.description,
              registration.representativeName,
              registration.representativeEmail,
            ],
          );
          universityId = university.insertId;

          const user = await query(
            connection,
            `INSERT INTO users (
               university_id, full_name, email, password_hash, phone,
               job_title, status
             ) VALUES (?, ?, ?, ?, ?, 'Administrator i universitetit', 'active')`,
            [
              universityId,
              registration.representativeName,
              registration.representativeEmail,
              registration.passwordHash,
              registration.representativePhone,
            ],
          );
          const roles = await query(
            connection,
            "SELECT id FROM roles WHERE code = ? LIMIT 1",
            ["university_admin"],
          );
          if (!roles[0]) {
            throw new Error(
              "Roli university_admin mungon në bazën e të dhënave.",
            );
          }

          await query(
            connection,
            `INSERT INTO user_roles (university_id, user_id, role_id)
             VALUES (?, ?, ?)`,
            [universityId, user.insertId, roles[0].id],
          );
          await query(
            connection,
            `INSERT INTO notifications (
               university_id, user_id, type, title, message
             ) VALUES (?, ?, 'university_approved', ?, ?)`,
            [
              universityId,
              user.insertId,
              "Universiteti u aktivizua",
              "Kërkesa u aprovua. Hapësira e universitetit është aktive.",
            ],
          );
        }

        await query(
          connection,
          `UPDATE university_registration_requests
           SET status = ?, review_reason = ?,
               reviewed_by_platform_admin_id = ?,
               reviewed_at = UTC_TIMESTAMP(3),
               created_university_id = ?
           WHERE id = ?`,
          [decision, reason, platformAdminId, universityId, registration.id],
        );
        await query(
          connection,
          `INSERT INTO platform_activity_logs (
             platform_admin_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'university_registration_request', ?, ?, ?, ?)`,
          [
            platformAdminId,
            `university_registration.${decision}`,
            registration.id,
            decision === "approved"
              ? "Kërkesa e universitetit u aprovua."
              : "Kërkesa e universitetit u refuzua.",
            JSON.stringify({ reason, universityId }),
            ipAddress,
          ],
        );

        return {
          id: String(registration.id),
          status: decision,
          universityId: universityId ? String(universityId) : null,
        };
      });
    },
  };
}
