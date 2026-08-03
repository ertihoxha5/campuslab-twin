import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const statuses = ["new", "acknowledged", "in_progress", "resolved", "closed"];
const severities = ["info", "warning", "critical"];
const listSchema = z.object({
  laboratoryId: z.coerce.number().int().positive().optional().transform((value) =>
    value ? String(value) : undefined,
  ),
  status: z.enum(statuses).optional(),
  severity: z.enum(severities).optional(),
  search: z.string().trim().max(180).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const transitionSchema = z.object({
  status: z.enum(["acknowledged", "in_progress", "resolved", "closed"]),
  notes: z.string().trim().max(2000).optional().default(""),
});
const nextStatus = {
  new: "acknowledged",
  acknowledged: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

const validationError = () =>
  new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Filtrat e alarmeve nuk janë të vlefshëm.",
  });
const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Alarmi i kërkuar nuk u gjet.",
  });

export function createAlertService({ repository, realtimePublisher }) {
  const access = (context) => ({
    universityId: context.universityId,
    userId: context.userId,
    restrictToAssignments: requiresLaboratoryAssignment(context),
  });

  return {
    async list(input = {}, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const { page, pageSize, ...filters } = parsed.data;
      const result = await repository.list({
        ...access(context),
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return {
        items: result.items,
        pagination: {
          page,
          pageSize,
          total: result.total,
          pages: Math.ceil(result.total / pageSize),
        },
      };
    },
    async detail(alertId, context) {
      if (!/^[1-9]\d*$/.test(String(alertId))) throw notFound();
      const alert = await repository.findById({
        ...access(context),
        alertId: String(alertId),
      });
      if (!alert) throw notFound();
      return {
        ...alert,
        history: await repository.history({
          universityId: context.universityId,
          alertId: String(alertId),
        }),
      };
    },
    async transition(alertId, input, context) {
      if (!/^[1-9]\d*$/.test(String(alertId))) throw notFound();
      const parsed = transitionSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const { status, notes } = parsed.data;
      if (["acknowledged", "resolved"].includes(status) && !notes) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message:
            status === "acknowledged"
              ? "Shënimi i pranimit është i detyrueshëm."
              : "Shënimi i zgjidhjes është i detyrueshëm.",
        });
      }
      const current = await repository.findById({
        ...access(context),
        alertId: String(alertId),
      });
      if (!current) throw notFound();
      if (nextStatus[current.status] !== status) {
        throw new AppError({
          status: 409,
          code: "INVALID_ALERT_TRANSITION",
          message: "Ky ndryshim i statusit të alarmit nuk lejohet.",
        });
      }
      const alert = await repository.transition({
        ...access(context),
        alertId: String(alertId),
        status,
        notes: notes || null,
        ipAddress: context.ipAddress,
      });
      if (!alert) throw notFound();
      if (alert.invalidTransition) {
        throw new AppError({
          status: 409,
          code: "INVALID_ALERT_TRANSITION",
          message: "Statusi i alarmit ndryshoi. Rifreskojeni dhe provoni përsëri.",
        });
      }
      realtimePublisher?.publishAlert({
        universityId: context.universityId,
        laboratoryId: alert.laboratoryId,
        alert: { ...alert, created: false },
        recordedAt: new Date().toISOString(),
      });
      return alert;
    },
  };
}
