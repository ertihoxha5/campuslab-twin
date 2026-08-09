import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";
import { exportReport } from "./exporter.js";

const reportTypes = [
  "laboratory",
  "energy",
  "alerts",
  "equipment_health",
  "maintenance",
  "simulation",
];
const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  laboratoryId: optionalId(),
  reportType: z.enum(reportTypes).optional(),
});
const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  reportType: z.enum(reportTypes),
  laboratoryId: optionalId(),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
  format: z.enum(["pdf", "csv"]),
  dataSource: z.enum(["physical", "simulated", "mixed"]),
});

export function createReportService({
  repository,
  analyticsService,
  clock = () => new Date(),
}) {
  return {
    async list(input, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const result = await repository.list({
        ...parsed.data,
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
      });
      return {
        reports: result.reports.map(normalizeReport),
        pagination: {
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          total: result.total,
        },
      };
    },

    async create(input, context) {
      const parsed = createSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const periodStart = new Date(parsed.data.periodStart);
      const periodEnd = new Date(parsed.data.periodEnd);
      if (periodEnd <= periodStart)
        throw validationError("Fundi i periudhës duhet të jetë pas fillimit.");
      const generatedAt = clock();
      const snapshot = analyticsService
        ? await analyticsService.history(
            {
              metric: reportMetric(parsed.data.reportType),
              interval: "daily",
              laboratoryId: parsed.data.laboratoryId,
              startAt: periodStart.toISOString(),
              endAt: periodEnd.toISOString(),
            },
            context,
          )
        : undefined;
      const detectedDataSource = snapshot
        ? dataSourceFrom(snapshot.provenance)
        : parsed.data.dataSource;
      const report = await repository.create({
        ...parsed.data,
        periodStart,
        periodEnd,
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        parameters: {
          format: parsed.data.format,
          dataSource: detectedDataSource,
          requestedDataSource: parsed.data.dataSource,
          generatedAt: generatedAt.toISOString(),
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          ...(snapshot ? { snapshot } : {}),
        },
      });
      if (!report)
        throw new AppError({
          status: 404,
          code: "LABORATORY_NOT_FOUND",
          message: "Laboratori nuk ekziston ose nuk ju është caktuar.",
        });
      return normalizeReport(report);
    },

    async download(reportId, context) {
      if (!/^\d+$/.test(String(reportId))) throw reportNotFound();
      const report = await repository.findAccessibleById({
        reportId: String(reportId),
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
      });
      if (!report) throw reportNotFound();
      const normalized = normalizeReport(report);
      const exported = await exportReport(normalized);
      return {
        ...exported,
        filename: `raporti-${normalized.id}.${exported.extension}`,
      };
    },
  };
}

function reportMetric(reportType) {
  return {
    energy: "power",
    alerts: "alerts",
    equipment_health: "equipment_health",
    maintenance: "maintenance",
    simulation: "equipment_health",
    laboratory: "temperature",
  }[reportType];
}

function dataSourceFrom(provenance = []) {
  const sources = provenance
    .filter((item) => Number(item.samples) > 0)
    .map((item) => item.source);
  if (!sources.length) return "unknown";
  if (sources.length > 1) return "mixed";
  return sources[0] === "simulated" ? "simulated" : "physical";
}

function reportNotFound() {
  return new AppError({
    status: 404,
    code: "REPORT_NOT_FOUND",
    message: "Raporti nuk ekziston ose nuk ju lejohet.",
  });
}

function normalizeReport(report) {
  let parameters = report.parameters ?? {};
  if (typeof parameters === "string") parameters = JSON.parse(parameters);
  return {
    ...report,
    id: String(report.id),
    universityId: String(report.universityId),
    laboratoryId:
      report.laboratoryId == null ? null : String(report.laboratoryId),
    generatedByUserId: String(report.generatedByUserId),
    parameters,
  };
}

function optionalId() {
  return z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined));
}

function validationError(
  message = "Të dhënat e raportit nuk janë të vlefshme.",
) {
  return new AppError({ status: 422, code: "VALIDATION_ERROR", message });
}
