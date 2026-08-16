export const MAX_VISIBLE_OCCUPANTS = 16;

export function occupancyRepresentation(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const visible = Math.min(total, MAX_VISIBLE_OCCUPANTS);
  return {
    total,
    visible,
    aggregated: total > visible,
    peoplePerFigure: visible > 0 ? Math.ceil(total / visible) : 0,
  };
}

export function scheduledOccupancy(date = new Date(), capacity = 24) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Tirane",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (["Sat", "Sun"].includes(value.weekday)) return 0;
  const minutes = Number(value.hour) * 60 + Number(value.minute);
  const schedule = [
    [7 * 60 + 45, 8 * 60, 1, 3],
    [8 * 60, 9 * 60, 4, 9],
    [9 * 60, 12 * 60, 10, 18],
    [12 * 60, 13 * 60, 3, 7],
    [13 * 60, 16 * 60 + 30, 8, 16],
    [16 * 60 + 30, 18 * 60, 2, 7],
  ];
  const slot = schedule.find(([start, end]) => minutes >= start && minutes < end);
  if (!slot) return 0;
  const [, , minimum, maximum] = slot;
  const wave = (Math.sin(minutes / 17) + 1) / 2;
  return Math.min(Math.max(0, Number(capacity) || 24), Math.round(minimum + wave * (maximum - minimum)));
}

export function resolveOccupancy({ now = new Date(), capacity, sensors = [], readings = {}, snapshot = 0 }) {
  const occupancySensors = sensors.filter((sensor) => sensor.sensorType === "occupancy");
  const freshReadings = occupancySensors
    .map((sensor) => readings[String(sensor.id)])
    .filter((reading) => {
      if (!reading) return false;
      const recordedAt = reading.recordedAt ?? reading.createdAt;
      if (!recordedAt) return true;
      const timestamp = new Date(recordedAt).getTime();
      return Number.isFinite(timestamp) && now.getTime() - timestamp <= 10 * 60 * 1000;
    });
  if (freshReadings.length) {
    return { value: freshReadings.reduce((sum, reading) => sum + Number(reading.value ?? 0), 0), simulated: false };
  }
  return {
    value: scheduledOccupancy(now, capacity ?? snapshot ?? 24),
    simulated: true,
  };
}
