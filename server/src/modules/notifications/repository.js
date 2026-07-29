import { query } from "../../database/query.js";

export function createNotificationRepository(pool) {
  return {
    async listForUser({ universityId, userId, limit = 20 }) {
      const items = await query(
        pool,
        `SELECT id, type, title, message, readAt, createdAt
         FROM (
           SELECT id, type, title, message, read_at AS readAt,
                  created_at AS createdAt,
                  ROW_NUMBER() OVER (
                    ORDER BY created_at DESC, id DESC
                  ) AS rowNumber
           FROM notifications
           WHERE university_id = ? AND user_id = ?
         ) ranked
         WHERE rowNumber <= ?
         ORDER BY rowNumber`,
        [universityId, userId, limit],
      );
      const unread = await query(
        pool,
        `SELECT COUNT(*) AS total
         FROM notifications
         WHERE university_id = ? AND user_id = ? AND read_at IS NULL`,
        [universityId, userId],
      );
      return {
        items: items.map((item) => ({ ...item, id: String(item.id) })),
        unreadCount: Number(unread[0]?.total ?? 0),
      };
    },

    async markRead({ universityId, userId, notificationId }) {
      const result = await query(
        pool,
        `UPDATE notifications
         SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3))
         WHERE id = ? AND university_id = ? AND user_id = ?`,
        [notificationId, universityId, userId],
      );
      return result.affectedRows > 0;
    },

    async markAllRead({ universityId, userId }) {
      await query(
        pool,
        `UPDATE notifications
         SET read_at = UTC_TIMESTAMP(3)
         WHERE university_id = ? AND user_id = ? AND read_at IS NULL`,
        [universityId, userId],
      );
    },
  };
}
