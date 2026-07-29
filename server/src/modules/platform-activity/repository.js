import { query } from "../../database/query.js";

export function createPlatformActivityRepository(pool) {
  return {
    async list({ search, category, limit, offset }) {
      const filters = [];
      const parameters = [];
      if (search) {
        filters.push(
          "(activity.description LIKE ? OR administrator.full_name LIKE ? OR administrator.email LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern);
      }
      if (category) {
        filters.push("activity.action LIKE ?");
        parameters.push(`${category}.%`);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT id, action, entityType, entityId, description,
                  administratorName, createdAt
           FROM (
             SELECT activity.id, activity.action,
                    activity.entity_type AS entityType,
                    activity.entity_id AS entityId,
                    activity.description,
                    COALESCE(administrator.full_name, 'Sistemi') AS administratorName,
                    activity.created_at AS createdAt,
                    ROW_NUMBER() OVER (
                      ORDER BY activity.created_at DESC, activity.id DESC
                    ) AS rowNumber
             FROM platform_activity_logs activity
             LEFT JOIN platform_admins administrator
               ON administrator.id = activity.platform_admin_id
             ${where}
           ) ranked
           WHERE rowNumber > ? AND rowNumber <= ?
           ORDER BY rowNumber`,
          [...parameters, offset, offset + limit],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM platform_activity_logs activity
           LEFT JOIN platform_admins administrator
             ON administrator.id = activity.platform_admin_id
           ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },
  };
}
