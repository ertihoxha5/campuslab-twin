export function createReadingHistoryMaintenance({
  repository,
  retentionDays,
  aggregationIntervalMinutes,
  maintenanceIntervalMinutes,
  clock = () => new Date(),
  setIntervalFunction = setInterval,
  clearIntervalFunction = clearInterval,
  onError = () => {},
} = {}) {
  let timer = null;
  let executing = false;

  async function runNow() {
    if (executing) return { skipped: true, reason: "already_running" };
    executing = true;
    try {
      const cutoff = new Date(
        clock().getTime() - Number(retentionDays) * 24 * 60 * 60 * 1000,
      );
      return await repository.aggregateAndPrune({
        cutoff: toDatabaseDateTime(cutoff),
        intervalMinutes: Number(aggregationIntervalMinutes),
      });
    } catch (error) {
      onError(error);
      return { skipped: true, reason: "failed" };
    } finally {
      executing = false;
    }
  }

  return {
    async start() {
      if (timer) return false;
      timer = setIntervalFunction(
        () => void runNow(),
        Number(maintenanceIntervalMinutes) * 60 * 1000,
      );
      await runNow();
      return true;
    },
    stop() {
      if (!timer) return false;
      clearIntervalFunction(timer);
      timer = null;
      return true;
    },
    runNow,
  };
}

function toDatabaseDateTime(value) {
  return value.toISOString().slice(0, 23).replace("T", " ");
}
