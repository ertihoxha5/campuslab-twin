import { query, withTransaction } from "../../database/query.js";

const laboratoryAssignmentScope = `
  (? = 0 OR EXISTS (
    SELECT 1 FROM user_laboratory_assignments assignment
    WHERE assignment.university_id = task.university_id
      AND assignment.laboratory_id = task.laboratory_id
      AND assignment.user_id = ?
  ))
`;

export function createMaintenanceRepository(pool) {
  return {
    async list({
      universityId,
      userId,
      restrictToAssignments,
      restrictToAssignedWork,
      laboratoryId,
      equipmentId,
      assignedUserId,
      type,
      priority,
      status,
      search,
      limit,
      offset,
    }) {
      const filters = [
        "task.university_id = ?",
        laboratoryAssignmentScope,
        "(? = 0 OR task.assigned_user_id = ?)",
      ];
      const parameters = [
        universityId,
        restrictToAssignments ? 1 : 0,
        userId,
        restrictToAssignedWork ? 1 : 0,
        userId,
      ];
      for (const [value, column] of [
        [laboratoryId, "task.laboratory_id"],
        [equipmentId, "task.equipment_id"],
        [assignedUserId, "task.assigned_user_id"],
        [type, "task.type"],
        [priority, "task.priority"],
        [status, "task.status"],
      ]) {
        if (value) {
          filters.push(`${column} = ?`);
          parameters.push(value);
        }
      }
      if (search) {
        const pattern = `%${search}%`;
        filters.push(
          "(task.title LIKE ? OR task.description LIKE ? OR equipment.name LIKE ? OR equipment.code LIKE ?)",
        );
        parameters.push(pattern, pattern, pattern, pattern);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const paginationLimit = Math.max(1, Math.trunc(Number(limit)) || 1);
      const paginationOffset = Math.max(0, Math.trunc(Number(offset)) || 0);
      const joins = `
        INNER JOIN laboratories laboratory
          ON laboratory.id = task.laboratory_id
         AND laboratory.university_id = task.university_id
        INNER JOIN equipment
          ON equipment.id = task.equipment_id
         AND equipment.university_id = task.university_id
        LEFT JOIN users assigned
          ON assigned.id = task.assigned_user_id
         AND assigned.university_id = task.university_id`;
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT task.id, task.laboratory_id AS laboratoryId,
                  laboratory.name AS laboratoryName,
                  task.equipment_id AS equipmentId,
                  equipment.name AS equipmentName, equipment.code AS equipmentCode,
                  task.assigned_user_id AS assignedUserId,
                  assigned.full_name AS assignedUserName,
                  task.type, task.priority, task.title, task.description,
                  task.status, task.checklist_json AS checklist,
                  task.scheduled_at AS scheduledAt, task.due_at AS dueAt,
                  task.completed_at AS completedAt, task.repair_details AS repairDetails,
                  task.cost, task.created_at AS createdAt, task.updated_at AS updatedAt,
                  (task.due_at < UTC_TIMESTAMP(3)
                    AND task.status NOT IN ('completed', 'cancelled')) AS overdue
           FROM maintenance_tasks task
           ${joins}
           ${where}
           ORDER BY FIELD(task.priority, 'critical', 'high', 'medium', 'low'),
                    COALESCE(task.due_at, '9999-12-31') ASC, task.id DESC
           LIMIT ${paginationLimit} OFFSET ${paginationOffset}`,
          parameters,
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total
           FROM maintenance_tasks task
           ${joins}
           ${where}`,
          parameters,
        ),
      ]);
      return { items, total: Number(totals[0]?.total ?? 0) };
    },

    async create({
      universityId,
      userId,
      restrictToAssignments,
      ipAddress,
      task,
    }) {
      return withTransaction(pool, async (connection) => {
        const laboratories = await query(
          connection,
          `SELECT laboratory.id
           FROM laboratories laboratory
           WHERE laboratory.university_id = ? AND laboratory.id = ?
             AND laboratory.deleted_at IS NULL
             AND (? = 0 OR EXISTS (
               SELECT 1 FROM user_laboratory_assignments assignment
               WHERE assignment.university_id = laboratory.university_id
                 AND assignment.laboratory_id = laboratory.id
                 AND assignment.user_id = ?
             ))
           LIMIT 1`,
          [
            universityId,
            task.laboratoryId,
            restrictToAssignments ? 1 : 0,
            userId,
          ],
        );
        if (!laboratories[0]) return { invalidLaboratory: true };

        const equipment = await query(
          connection,
          `SELECT id FROM equipment
           WHERE university_id = ? AND laboratory_id = ? AND id = ?
             AND deleted_at IS NULL
           LIMIT 1`,
          [universityId, task.laboratoryId, task.equipmentId],
        );
        if (!equipment[0]) return { invalidEquipment: true };

        if (task.assignedUserId) {
          const assignees = await query(
            connection,
            `SELECT user.id
             FROM users user
             INNER JOIN user_roles user_role
               ON user_role.user_id = user.id
              AND user_role.university_id = user.university_id
             INNER JOIN roles role ON role.id = user_role.role_id
             WHERE user.university_id = ? AND user.id = ?
               AND user.status = 'active' AND user.deleted_at IS NULL
               AND role.name = 'technician'
             LIMIT 1`,
            [universityId, task.assignedUserId],
          );
          if (!assignees[0]) return { invalidAssignee: true };
        }

        const result = await query(
          connection,
          `INSERT INTO maintenance_tasks (
             university_id, laboratory_id, equipment_id, assigned_user_id,
             type, priority, title, description, status, checklist_json,
             scheduled_at, due_at, created_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?)`,
          [
            universityId,
            task.laboratoryId,
            task.equipmentId,
            task.assignedUserId,
            task.type,
            task.priority,
            task.title,
            task.description,
            JSON.stringify(task.checklist),
            task.scheduledAt,
            task.dueAt,
            userId,
          ],
        );
        await query(
          connection,
          `INSERT INTO maintenance_updates (
             university_id, maintenance_task_id, user_id, status, notes
           ) VALUES (?, ?, ?, 'planned', ?)`,
          [
            universityId,
            result.insertId,
            userId,
            task.notes || "Detyra e mirëmbajtjes u planifikua.",
          ],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'maintenance.created', 'maintenance_task', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            result.insertId,
            `U krijua detyra e mirëmbajtjes ${task.title}.`,
            JSON.stringify({
              laboratoryId: task.laboratoryId,
              equipmentId: task.equipmentId,
              assignedUserId: task.assignedUserId,
            }),
            ipAddress,
          ],
        );
        return {
          id: String(result.insertId),
          ...task,
          status: "planned",
        };
      });
    },
  };
}
