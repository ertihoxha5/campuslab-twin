export function createMaintenanceReminderWorker({
  repository,
  upcomingHours = 24,
  intervalMinutes = 15,
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
      return await repository.generateDueNotifications({ upcomingHours });
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
        Number(intervalMinutes) * 60 * 1000,
      );
      timer?.unref?.();
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
