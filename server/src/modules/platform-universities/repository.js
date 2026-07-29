import { query, withTransaction } from "../../database/query.js";

export function createPlatformUniversityRepository(pool) {
  return {
    async list({ status, search, limit, offset }) {
      const filters = [];
      const parameters = [];
      if (status) {
        filters.push("university.status = ?");
        parameters.push(status);
      }
      if (search) {
        filters.push(
          "(university.name LIKE ? OR university.acronym LIKE ? OR university.representative_email LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT university.id, university.name, university.acronym,
                  university.institution_type AS institutionType,
                  university.status, university.city,
                  university.representative_name AS representativeName,
                  university.representative_email AS representativeEmail,
                  university.suspension_reason AS suspensionReason,
                  university.approved_at AS approvedAt,
                  COUNT(DISTINCT user.id) AS userCount
           FROM universities university
           LEFT JOIN users user
             ON user.university_id = university.id AND user.deleted_at IS NULL
           ${where}
           GROUP BY university.id
           ORDER BY university.created_at DESC, university.id DESC
           LIMIT ? OFFSET ?`,
          [...parameters, limit, offset],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total FROM universities university ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async changeStatus({
      universityId,
      nextStatus,
      reason,
      platformAdminId,
      ipAddress,
    }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT id, name, status
           FROM universities
           WHERE id = ?
           FOR UPDATE`,
          [universityId],
        );
        const university = rows[0];
        if (!university) return null;

        const expectedStatus =
          nextStatus === "suspended" ? "active" : "suspended";
        if (university.status !== expectedStatus) {
          return { invalidTransition: true, status: university.status };
        }

        await query(
          connection,
          `UPDATE universities
           SET status = ?, suspension_reason = ?
           WHERE id = ?`,
          [
            nextStatus,
            nextStatus === "suspended" ? reason : null,
            university.id,
          ],
        );

        if (nextStatus === "suspended") {
          await query(
            connection,
            `UPDATE refresh_tokens
             SET revoked_at = UTC_TIMESTAMP(3)
             WHERE university_id = ? AND revoked_at IS NULL`,
            [university.id],
          );
        }

        await query(
          connection,
          `INSERT INTO notifications (
             university_id, user_id, type, title, message
           )
           SELECT ?, user.id, ?, ?, ?
           FROM users user
           INNER JOIN user_roles assignment
             ON assignment.user_id = user.id
            AND assignment.university_id = user.university_id
           INNER JOIN roles role ON role.id = assignment.role_id
           WHERE user.university_id = ?
             AND user.status = 'active'
             AND user.deleted_at IS NULL
             AND role.code = 'university_admin'`,
          [
            university.id,
            nextStatus === "suspended"
              ? "university_suspended"
              : "university_reactivated",
            nextStatus === "suspended"
              ? "Universiteti u pezullua"
              : "Universiteti u riaktivizua",
            nextStatus === "suspended"
              ? `Qasja në platformë u pezullua. Arsyeja: ${reason}`
              : "Qasja në platformë u riaktivizua.",
            university.id,
          ],
        );
        await query(
          connection,
          `INSERT INTO platform_activity_logs (
             platform_admin_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'university', ?, ?, ?, ?)`,
          [
            platformAdminId,
            `university.${nextStatus}`,
            university.id,
            nextStatus === "suspended"
              ? "Universiteti u pezullua."
              : "Universiteti u riaktivizua.",
            JSON.stringify({ reason }),
            ipAddress,
          ],
        );

        return {
          id: String(university.id),
          name: university.name,
          status: nextStatus,
          suspensionReason: nextStatus === "suspended" ? reason : null,
        };
      });
    },
  };
}
