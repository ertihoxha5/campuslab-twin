import {
  createInitialSimulationState,
  generateSimulationStep,
} from "./generator.js";

export function createSimulationCoordinator({
  repository,
  clock = () => new Date(),
  setIntervalFunction = setInterval,
  clearIntervalFunction = clearInterval,
  millisecondsPerSecond = 1000,
} = {}) {
  const processes = new Map();

  const keyFor = ({ universityId, laboratoryId }) =>
    `${universityId}:${laboratoryId}`;

  async function activate(reference) {
    const key = keyFor(reference);
    if (processes.has(key)) return false;
    const runtime = await repository.loadRuntime(reference);
    if (!runtime || runtime.status !== "running") return false;
    const intervalSeconds = Math.max(
      1,
      Number(runtime.input.samplingIntervalSeconds) || 60,
    );
    const process = { reference: runtime, executing: false, timer: null };
    process.timer = setIntervalFunction(() => {
      void execute(process);
    }, intervalSeconds * millisecondsPerSecond);
    processes.set(key, process);
    return true;
  }

  async function execute(process) {
    if (process.executing) return false;
    process.executing = true;
    try {
      const runtime = await repository.loadRuntime(process.reference);
      if (!runtime || runtime.status !== "running") {
        deactivate(runtime ?? process.reference);
        return false;
      }
      const configuration = runtimeConfiguration(runtime);
      const generated = generateSimulationStep({
        seed: runtime.seedValue,
        sensors: runtime.sensors,
        previousState:
          runtime.result.generatorState ??
          createInitialSimulationState(configuration),
        configuration,
        recordedAt: clock(),
      });
      const recordedAt =
        generated.readings[0]?.recordedAt ?? clock().toISOString();
      const energyReadings = buildEnergyReadings({
        equipment: runtime.equipment,
        totalPowerWatts: generated.state.values.power,
        intervalSeconds: Number(runtime.input.samplingIntervalSeconds) || 60,
      });
      return repository.persistStep({
        universityId: runtime.universityId,
        laboratoryId: runtime.laboratoryId,
        runId: runtime.id,
        readings: generated.readings,
        energyReadings,
        generatorState: generated.state,
        event: generated.event,
        recordedAt: toDatabaseDateTime(recordedAt),
      });
    } catch (error) {
      deactivate(process.reference);
      await repository.markFailed({
        universityId: process.reference.universityId,
        laboratoryId: process.reference.laboratoryId,
        runId: process.reference.id,
        message: error.message,
      });
      return false;
    } finally {
      process.executing = false;
    }
  }

  function deactivate(reference) {
    const key = keyFor(reference);
    const process = processes.get(key);
    if (!process) return false;
    clearIntervalFunction(process.timer);
    processes.delete(key);
    return true;
  }

  return {
    activate,
    pause: deactivate,
    stop: deactivate,
    resume: activate,
    async runOnce(reference) {
      const runtime = await repository.loadRuntime(reference);
      if (!runtime || runtime.status !== "running") return false;
      return execute({ reference: runtime, executing: false, timer: null });
    },
    async restore() {
      const runs = await repository.recoverableRuns();
      let restored = 0;
      for (const run of runs) {
        if (run.status === "running" && (await activate(run))) restored += 1;
      }
      return { found: runs.length, restored };
    },
    activeCount() {
      return processes.size;
    },
  };
}

function runtimeConfiguration(runtime) {
  const configuration = { ...(runtime.input.configuration ?? {}) };
  const ratedWatts = runtime.equipment.reduce(
    (total, item) => total + Number(item.energyRatingWatts ?? 0),
    0,
  );
  if (configuration.activeEquipmentWatts == null) {
    configuration.activeEquipmentWatts = ratedWatts;
  }
  if (configuration.initialValues?.equipment_health == null) {
    const healthValues = runtime.equipment.map((item) =>
      Number(item.healthScore ?? 100),
    );
    configuration.initialValues = {
      ...(configuration.initialValues ?? {}),
      equipment_health:
        healthValues.length > 0
          ? healthValues.reduce((sum, value) => sum + value, 0) /
            healthValues.length
          : 100,
    };
  }
  return configuration;
}

function buildEnergyReadings({ equipment, totalPowerWatts, intervalSeconds }) {
  const weighted = equipment.map((item) => ({
    equipmentId: item.id,
    weight: Math.max(0, Number(item.energyRatingWatts ?? 0)),
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return [];
  return weighted.map((item) => {
    const powerWatts = (totalPowerWatts * item.weight) / totalWeight;
    return {
      equipmentId: item.equipmentId,
      powerWatts: round(powerWatts, 4),
      energyKwh: round((powerWatts * intervalSeconds) / (3600 * 1000), 6),
    };
  });
}

function toDatabaseDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function round(value, precision) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
