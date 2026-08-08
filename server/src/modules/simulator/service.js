import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";
import {
  createInitialSimulationState,
  generateSimulationStep,
} from "./generator.js";
import { buildScenarioConfiguration } from "./scenarios.js";

const startSchema = z.object({
  scenarioId: z.coerce.number().int().positive().transform(String),
  samplingIntervalSeconds: z.coerce.number().int().min(1).max(3600).default(60),
});

const validId = (value) => /^[1-9]\d*$/.test(String(value));

const previewSchema = z.object({
  scenarioId: z.coerce.number().int().positive().transform(String),
  overrides: z.record(z.string(), z.unknown()).default({}),
});

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Laboratori ose simulimi i kërkuar nuk u gjet.",
  });

const conflict = (message) =>
  new AppError({
    status: 409,
    code: "SIMULATION_STATE_CONFLICT",
    message,
  });

function repositoryContext(context, laboratoryId) {
  return {
    universityId: context.universityId,
    userId: context.userId,
    restrictToAssignments: requiresLaboratoryAssignment(context),
    laboratoryId,
    ipAddress: context.ipAddress,
  };
}

async function previewScenario(repository, laboratoryId, input, context) {
  if (!validId(laboratoryId)) throw notFound();
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success)
    throw validationError(
      "Preview i skenarit nuk është i vlefshëm.",
      parsed.error,
    );
  const source = validateResult(
    await repository.previewSource({
      ...repositoryContext(context, laboratoryId),
      scenarioId: parsed.data.scenarioId,
    }),
  );
  const built = buildScenarioConfiguration({
    scenarioType: source.scenarioType,
    storedConfiguration: source.configuration,
    overrides: parsed.data.overrides,
  });
  if (built.invalidScenarioType) throw notFound();
  if (built.validationError) {
    throw validationError(
      "Konfigurimi i skenarit nuk është i vlefshëm.",
      built.validationError,
    );
  }
  let state = createInitialSimulationState(built.configuration);
  const timeline = [];
  for (let tick = 1; tick <= built.previewTicks; tick += 1) {
    const step = generateSimulationStep({
      seed: source.seedValue,
      sensors: [],
      previousState: state,
      configuration: built.configuration,
      recordedAt: new Date(tick * 1000).toISOString(),
    });
    state = step.state;
    timeline.push({ tick, values: step.state.values, event: step.event });
  }
  return {
    scenario: {
      id: source.id,
      name: source.name,
      type: built.scenarioType,
      label: built.label,
    },
    configuration: built.configuration,
    timeline,
    persisted: false,
  };
}

function validationError(message, error) {
  return new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message,
    details: Object.fromEntries(
      error.issues.map((issue) => [
        String(issue.path.join(".") || "form"),
        [issue.message],
      ]),
    ),
  });
}

function validateResult(result) {
  if (!result || result.invalidLaboratory || result.invalidScenario) {
    throw notFound();
  }
  if (result.duplicateRun) {
    throw conflict("Ky laborator ka tashmë një simulim aktiv.");
  }
  if (result.noActiveRun) {
    throw conflict("Laboratori nuk ka simulim aktiv.");
  }
  if (result.invalidState) {
    throw conflict("Simulimi nuk është në gjendjen e duhur për këtë veprim.");
  }
  return result;
}

export function createSimulatorService({ repository, coordinator }) {
  return {
    async preview(laboratoryId, input, context) {
      return previewScenario(repository, laboratoryId, input, context);
    },

    async status(laboratoryId, context) {
      if (!validId(laboratoryId)) throw notFound();
      const result = await repository.status(
        repositoryContext(context, laboratoryId),
      );
      if (!result || result.invalidLaboratory) throw notFound();
      return result;
    },

    async start(laboratoryId, input, context) {
      if (!validId(laboratoryId)) throw notFound();
      const parsed = startSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Të dhënat e nisjes së simulimit nuk janë të vlefshme.",
          details: Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0] ?? "form"),
              [issue.message],
            ]),
          ),
        });
      }
      const run = validateResult(
        await repository.start({
          ...repositoryContext(context, laboratoryId),
          ...parsed.data,
        }),
      );
      await coordinator?.activate({
        universityId: context.universityId,
        laboratoryId,
        runId: run.id,
      });
      return run;
    },

    async pause(laboratoryId, context) {
      return transition(
        repository,
        coordinator,
        "pause",
        laboratoryId,
        context,
      );
    },

    async resume(laboratoryId, context) {
      return transition(
        repository,
        coordinator,
        "resume",
        laboratoryId,
        context,
      );
    },

    async stop(laboratoryId, context) {
      return transition(repository, coordinator, "stop", laboratoryId, context);
    },
  };
}

async function transition(
  repository,
  coordinator,
  action,
  laboratoryId,
  context,
) {
  if (!validId(laboratoryId)) throw notFound();
  const run = validateResult(
    await repository.transition({
      ...repositoryContext(context, laboratoryId),
      action,
    }),
  );
  await coordinator?.[action]({
    universityId: context.universityId,
    laboratoryId,
    runId: run.id,
  });
  return run;
}
