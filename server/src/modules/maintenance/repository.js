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
    async options({
      universityId,
      userId,
      restrictToAssignments,
      laboratoryId,
    }) {
      const laboratories = await query(
        pool,
        `SELECT laboratory.id, laboratory.name, laboratory.code
         FROM laboratories laboratory
         WHERE laboratory.university_id = ?
           AND laboratory.deleted_at IS NULL
           AND (? = 0 OR EXISTS (
             SELECT 1 FROM user_laboratory_assignments assignment
             WHERE assignment.university_id = laboratory.university_id
               AND assignment.laboratory_id = laboratory.id
               AND assignment.user_id = ?
           ))
         ORDER BY laboratory.name, laboratory.id`,
        [universityId, restrictToAssignments ? 1 : 0, userId],
      );
      const laboratoryIsAccessible =
        laboratoryId &&
        laboratories.some((item) => String(item.id) === String(laboratoryId));
      if (!laboratoryIsAccessible) {
        return { laboratories, equipment: [], technicians: [] };
      }
      const [equipment, technicians] = await Promise.all([
        query(
          pool,
          `SELECT id, name, code, status
           FROM equipment
           WHERE university_id = ? AND laboratory_id = ?
             AND deleted_at IS NULL
           ORDER BY name, id`,
          [universityId, laboratoryId],
        ),
        query(
          pool,
          `SELECT DISTINCT user.id, user.full_name AS fullName,
                  user.job_title AS jobTitle
           FROM users user
           INNER JOIN user_roles user_role
             ON user_role.user_id = user.id
            AND user_role.university_id = user.university_id
           INNER JOIN roles role ON role.id = user_role.role_id
           INNER JOIN user_laboratory_assignments assignment
             ON assignment.user_id = user.id
            AND assignment.university_id = user.university_id
            AND assignment.laboratory_id = ?
           WHERE user.university_id = ? AND role.name = 'technician'
             AND user.status = 'active' AND user.deleted_at IS NULL
           ORDER BY user.full_name, user.id`,
          [laboratoryId, universityId],
        ),
      ]);
      return { laboratories, equipment, technicians };
    },

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

    async findById({
      universityId,
      userId,
      restrictToAssignments,
      restrictToAssignedWork,
      taskId,
    }) {
      const rows = await query(
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
                task.completed_at AS completedAt,
                task.repair_details AS repairDetails, task.cost,
                task.created_by_user_id AS createdByUserId,
                creator.full_name AS createdByUserName,
                task.created_at AS createdAt, task.updated_at AS updatedAt
         FROM maintenance_tasks task
         INNER JOIN laboratories laboratory
           ON laboratory.id = task.laboratory_id
          AND laboratory.university_id = task.university_id
         INNER JOIN equipment
           ON equipment.id = task.equipment_id
          AND equipment.university_id = task.university_id
         LEFT JOIN users assigned
           ON assigned.id = task.assigned_user_id
          AND assigned.university_id = task.university_id
         INNER JOIN users creator
           ON creator.id = task.created_by_user_id
          AND creator.university_id = task.university_id
         WHERE task.university_id = ? AND task.id = ?
           AND ${laboratoryAssignmentScope}
           AND (? = 0 OR task.assigned_user_id = ?)
         LIMIT 1`,
        [
          universityId,
          taskId,
          restrictToAssignments ? 1 : 0,
          userId,
          restrictToAssignedWork ? 1 : 0,
          userId,
        ],
      );
      return rows[0] ?? null;
    },

    async history({ universityId, taskId }) {
      return query(
        pool,
        `SELECT maintenance_update.id, maintenance_update.status,
                maintenance_update.notes,
                maintenance_update.user_id AS userId,
                user.full_name AS userName,
                maintenance_update.created_at AS createdAt
         FROM maintenance_updates maintenance_update
         INNER JOIN users user
           ON user.id = maintenance_update.user_id
          AND user.university_id = maintenance_update.university_id
         WHERE maintenance_update.university_id = ?
           AND maintenance_update.maintenance_task_id = ?
         ORDER BY maintenance_update.created_at ASC, maintenance_update.id ASC`,
        [universityId, taskId],
      );
    },

    async listEvidence({
      universityId,
      userId,
      restrictToAssignments,
      restrictToAssignedWork,
      taskId,
    }) {
      const accessible = await query(
        pool,
        `SELECT task.id
         FROM maintenance_tasks task
         WHERE task.university_id = ? AND task.id = ?
           AND ${laboratoryAssignmentScope}
           AND (? = 0 OR task.assigned_user_id = ?)
         LIMIT 1`,
        [
          universityId,
          taskId,
          restrictToAssignments ? 1 : 0,
          userId,
          restrictToAssignedWork ? 1 : 0,
          userId,
        ],
      );
      if (!accessible[0]) return null;

      return query(
        pool,
        `SELECT evidence.id, evidence.maintenance_update_id AS maintenanceUpdateId,
                evidence.caption, evidence.uploaded_by_user_id AS uploadedByUserId,
                uploader.full_name AS uploadedByUserName,
                stored_file.id AS fileId, stored_file.original_name AS originalName,
                stored_file.mime_type AS mimeType,
                stored_file.size_bytes AS sizeBytes,
                evidence.created_at AS createdAt
         FROM maintenance_evidence evidence
         INNER JOIN stored_files stored_file
           ON stored_file.id = evidence.stored_file_id
          AND stored_file.university_id = evidence.university_id
         INNER JOIN users uploader
           ON uploader.id = evidence.uploaded_by_user_id
          AND uploader.university_id = evidence.university_id
         WHERE evidence.university_id = ?
           AND evidence.maintenance_task_id = ?
         ORDER BY evidence.created_at ASC, evidence.id ASC`,
        [universityId, taskId],
      );
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

    async addEvidence({
      universityId,
      userId,
      restrictToAssignments,
      restrictToAssignedWork,
      taskId,
      ipAddress,
      evidence,
    }) {
      return withTransaction(pool, async (connection) => {
        const tasks = await query(
          connection,
          `SELECT task.id, task.title
           FROM maintenance_tasks task
           WHERE task.university_id = ? AND task.id = ?
             AND ${laboratoryAssignmentScope}
             AND (? = 0 OR task.assigned_user_id = ?)
           LIMIT 1`,
          [
            universityId,
            taskId,
            restrictToAssignments ? 1 : 0,
            userId,
            restrictToAssignedWork ? 1 : 0,
            userId,
          ],
        );
        if (!tasks[0]) return null;

        if (evidence.maintenanceUpdateId) {
          const updates = await query(
            connection,
            `SELECT id FROM maintenance_updates
             WHERE university_id = ? AND maintenance_task_id = ? AND id = ?
             LIMIT 1`,
            [universityId, taskId, evidence.maintenanceUpdateId],
          );
          if (!updates[0]) return { invalidUpdate: true };
        }

        const fileResult = await query(
          connection,
          `INSERT INTO stored_files (
             university_id, uploaded_by_user_id, category,
             original_name, stored_name, relative_path, mime_type,
             size_bytes, checksum_sha256, related_entity_type, related_entity_id
           ) VALUES (?, ?, 'maintenance_evidence', ?, ?, ?, ?, ?, ?,
                     'maintenance_task', ?)`,
          [
            universityId,
            userId,
            evidence.originalName,
            evidence.storedName,
            evidence.relativePath,
            evidence.mimeType,
            evidence.sizeBytes,
            evidence.checksumSha256,
            taskId,
          ],
        );
        const evidenceResult = await query(
          connection,
          `INSERT INTO maintenance_evidence (
             university_id, maintenance_task_id, maintenance_update_id,
             stored_file_id, uploaded_by_user_id, caption
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            taskId,
            evidence.maintenanceUpdateId,
            fileResult.insertId,
            userId,
            evidence.caption,
          ],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'maintenance.evidence_added', 'maintenance_task',
                     ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            taskId,
            `U shtua evidencë për detyrën ${tasks[0].title}.`,
            JSON.stringify({
              evidenceId: String(evidenceResult.insertId),
              fileId: String(fileResult.insertId),
              maintenanceUpdateId: evidence.maintenanceUpdateId,
            }),
            ipAddress,
          ],
        );
        return {
          id: String(evidenceResult.insertId),
          fileId: String(fileResult.insertId),
          maintenanceTaskId: String(taskId),
          maintenanceUpdateId: evidence.maintenanceUpdateId,
          originalName: evidence.originalName,
          mimeType: evidence.mimeType,
          sizeBytes: evidence.sizeBytes,
          caption: evidence.caption,
        };
      });
    },

    async transition({
      universityId,
      userId,
      restrictToAssignments,
      restrictToAssignedWork,
      taskId,
      ipAddress,
      update,
    }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT task.id, task.laboratory_id AS laboratoryId,
                  task.equipment_id AS equipmentId, task.type,
                  task.title, task.status
           FROM maintenance_tasks task
           WHERE task.university_id = ? AND task.id = ?
             AND ${laboratoryAssignmentScope}
             AND (? = 0 OR task.assigned_user_id = ?)
           LIMIT 1 FOR UPDATE`,
          [
            universityId,
            taskId,
            restrictToAssignments ? 1 : 0,
            userId,
            restrictToAssignedWork ? 1 : 0,
            userId,
          ],
        );
        const current = rows[0];
        if (!current) return null;

        const nextStatuses = {
          planned: ["in_progress", "cancelled"],
          in_progress: ["waiting", "completed", "cancelled"],
          waiting: ["in_progress", "cancelled"],
        };
        if (!nextStatuses[current.status]?.includes(update.status)) {
          return { invalidTransition: true };
        }

        await query(
          connection,
          `UPDATE maintenance_tasks
           SET status = ?, checklist_json = ?,
               repair_details = COALESCE(?, repair_details),
               cost = COALESCE(?, cost),
               completed_at = CASE
                 WHEN ? = 'completed' THEN UTC_TIMESTAMP(3) ELSE NULL
               END
           WHERE university_id = ? AND id = ?`,
          [
            update.status,
            JSON.stringify(update.checklist),
            update.repairDetails,
            update.cost,
            update.status,
            universityId,
            taskId,
          ],
        );
        await query(
          connection,
          `INSERT INTO maintenance_updates (
             university_id, maintenance_task_id, user_id, status, notes
           ) VALUES (?, ?, ?, ?, ?)`,
          [universityId, taskId, userId, update.status, update.notes],
        );

        if (["in_progress", "waiting", "completed"].includes(update.status)) {
          await query(
            connection,
            `UPDATE equipment
             SET status = CASE
                   WHEN ? = 'completed' THEN 'active' ELSE 'maintenance'
                 END,
                 health_score = CASE
                   WHEN ? = 'completed' THEN GREATEST(health_score, 90)
                   ELSE health_score
                 END
             WHERE university_id = ? AND id = ? AND deleted_at IS NULL`,
            [update.status, update.status, universityId, current.equipmentId],
          );
        }

        await query(
          connection,
          `INSERT INTO activity_logs (
             university_id, user_id, action, entity_type, entity_id,
             description, metadata_json, ip_address
           ) VALUES (?, ?, 'maintenance.status_changed', 'maintenance_task', ?, ?, ?, ?)`,
          [
            universityId,
            userId,
            taskId,
            `Statusi i detyrës ${current.title} u ndryshua në ${update.status}.`,
            JSON.stringify({
              fromStatus: current.status,
              toStatus: update.status,
              equipmentId: String(current.equipmentId),
            }),
            ipAddress,
          ],
        );

        return {
          ...current,
          id: String(current.id),
          laboratoryId: String(current.laboratoryId),
          equipmentId: String(current.equipmentId),
          status: update.status,
          checklist: update.checklist,
          repairDetails: update.repairDetails,
          cost: update.cost,
          notes: update.notes,
        };
      });
    },
  };
}
