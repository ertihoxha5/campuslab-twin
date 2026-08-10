import { query } from "../../database/query.js";

const reportSelect = `
  SELECT report.id, report.university_id AS universityId,
         report.laboratory_id AS laboratoryId,
         laboratory.name AS laboratoryName,
         report.generated_by_user_id AS generatedByUserId,
         user.full_name AS generatedByName,
         university.name AS universityName,
         report.report_type AS reportType, report.title,
         report.period_start AS periodStart, report.period_end AS periodEnd,
         report.parameters_json AS parameters, report.status,
         report.file_path AS filePath, report.created_at AS createdAt,
         report.updated_at AS updatedAt
    FROM reports report
    INNER JOIN universities university ON university.id = report.university_id
    INNER JOIN users user ON user.id = report.generated_by_user_id
      AND user.university_id = report.university_id
    LEFT JOIN laboratories laboratory ON laboratory.id = report.laboratory_id
      AND laboratory.university_id = report.university_id`;

export function createReportRepository(pool) {
  return {
    async list(context) {
      const filters = [
        "report.university_id = ?",
        "report.deleted_at IS NULL",
        assignmentScope(),
      ];
      const parameters = [
        context.universityId,
        context.restrictToAssignments ? 1 : 0,
        context.userId,
      ];
      if (context.laboratoryId) {
        filters.push("report.laboratory_id = ?");
        parameters.push(context.laboratoryId);
      }
      if (context.reportType) {
        filters.push("report.report_type = ?");
        parameters.push(context.reportType);
      }
      const offset = (context.page - 1) * context.pageSize;
      const where = `WHERE ${filters.join(" AND ")}`;
      const [reports, totals] = await Promise.all([
        query(
          pool,
          `${reportSelect} ${where} ORDER BY report.created_at DESC, report.id DESC LIMIT ? OFFSET ?`,
          [...parameters, context.pageSize, offset],
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total FROM reports report ${where}`,
          parameters,
        ),
      ]);
      return { reports, total: Number(totals[0]?.total ?? 0) };
    },

    async create(input) {
      const result = await query(
        pool,
        `INSERT INTO reports (
           university_id, laboratory_id, generated_by_user_id, report_type,
           title, period_start, period_end, parameters_json, status
         ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'ready'
         WHERE ? IS NULL OR EXISTS (
           SELECT 1 FROM laboratories laboratory
            WHERE laboratory.id = ? AND laboratory.university_id = ?
              AND laboratory.deleted_at IS NULL
              AND (? = 0 OR EXISTS (
                SELECT 1 FROM user_laboratory_assignments assignment
                 WHERE assignment.university_id = laboratory.university_id
                   AND assignment.laboratory_id = laboratory.id
                   AND assignment.user_id = ?
              ))
         )`,
        [
          input.universityId,
          input.laboratoryId ?? null,
          input.userId,
          input.reportType,
          input.title,
          toSqlDate(input.periodStart),
          toSqlDate(input.periodEnd),
          JSON.stringify(input.parameters),
          input.laboratoryId ?? null,
          input.laboratoryId ?? null,
          input.universityId,
          input.restrictToAssignments ? 1 : 0,
          input.userId,
        ],
      );
      if (!result.affectedRows) return null;
      const rows = await query(
        pool,
        `${reportSelect} WHERE report.id = ? AND report.university_id = ? AND report.deleted_at IS NULL`,
        [String(result.insertId), input.universityId],
      );
      return rows[0] ?? null;
    },

    async findAccessibleById(context) {
      const rows = await query(
        pool,
        `${reportSelect}
         WHERE report.id = ? AND report.university_id = ?
           AND report.deleted_at IS NULL AND ${assignmentScope()}`,
        [
          context.reportId,
          context.universityId,
          context.restrictToAssignments ? 1 : 0,
          context.userId,
        ],
      );
      return rows[0] ?? null;
    },
  };
}

function assignmentScope() {
  return `(? = 0 OR report.laboratory_id IS NULL OR EXISTS (
    SELECT 1 FROM user_laboratory_assignments assignment
     WHERE assignment.university_id = report.university_id
       AND assignment.laboratory_id = report.laboratory_id
       AND assignment.user_id = ?
  ))`;
}

function toSqlDate(value) {
  return value.toISOString().slice(0, 23).replace("T", " ");
}
