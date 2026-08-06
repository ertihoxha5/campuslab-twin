import { query } from "../../database/query.js";

export function createMaintenanceReminderRepository(pool) {
  return {
    async generateDueNotifications({ upcomingHours }) {
      const upcoming = await query(
        pool,
        `INSERT INTO notifications (
           university_id, user_id, maintenance_task_id, type,
           deduplication_key, title, message
         )
         SELECT task.university_id, task.assigned_user_id, task.id,
                'maintenance_upcoming',
                CONCAT('maintenance:', task.id, ':upcoming:',
                       DATE_FORMAT(task.due_at, '%Y%m%d%H%i%s')),
                'Mirëmbajtja po afrohet',
                CONCAT('Detyra "', task.title, '" për pajisjen ', equipment.name,
                       ' ka afat më ', DATE_FORMAT(task.due_at, '%d.%m.%Y %H:%i'), '.')
         FROM maintenance_tasks task
         INNER JOIN equipment
           ON equipment.id = task.equipment_id
          AND equipment.university_id = task.university_id
         INNER JOIN users assigned
           ON assigned.id = task.assigned_user_id
          AND assigned.university_id = task.university_id
          AND assigned.status = 'active'
          AND assigned.deleted_at IS NULL
         WHERE task.assigned_user_id IS NOT NULL
           AND task.status IN ('planned', 'in_progress', 'waiting')
           AND task.due_at > UTC_TIMESTAMP(3)
           AND task.due_at <= DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? HOUR)
         ON DUPLICATE KEY UPDATE
           deduplication_key = VALUES(deduplication_key)`,
        [upcomingHours],
      );

      const overdue = await query(
        pool,
        `INSERT INTO notifications (
           university_id, user_id, maintenance_task_id, type,
           deduplication_key, title, message
         )
         SELECT task.university_id, task.assigned_user_id, task.id,
                'maintenance_overdue',
                CONCAT('maintenance:', task.id, ':overdue:',
                       DATE_FORMAT(task.due_at, '%Y%m%d%H%i%s')),
                'Mirëmbajtja ka kaluar afatin',
                CONCAT('Detyra "', task.title, '" për pajisjen ', equipment.name,
                       ' ka kaluar afatin e datës ',
                       DATE_FORMAT(task.due_at, '%d.%m.%Y %H:%i'), '.')
         FROM maintenance_tasks task
         INNER JOIN equipment
           ON equipment.id = task.equipment_id
          AND equipment.university_id = task.university_id
         INNER JOIN users assigned
           ON assigned.id = task.assigned_user_id
          AND assigned.university_id = task.university_id
          AND assigned.status = 'active'
          AND assigned.deleted_at IS NULL
         WHERE task.assigned_user_id IS NOT NULL
           AND task.status IN ('planned', 'in_progress', 'waiting')
           AND task.due_at <= UTC_TIMESTAMP(3)
         ON DUPLICATE KEY UPDATE
           deduplication_key = VALUES(deduplication_key)`,
      );

      return {
        upcomingAffected: Number(upcoming.affectedRows ?? 0),
        overdueAffected: Number(overdue.affectedRows ?? 0),
      };
    },
  };
}
