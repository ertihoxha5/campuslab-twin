export const NORMAL_RANGES = Object.freeze({
  temperature: { min: 18, max: 26, unit: "°C" },
  humidity: { min: 30, max: 60, unit: "%" },
  occupancy: { min: 0, max: 25, unit: "persona" },
  power: { min: 500, max: 5000, unit: "W" },
});

export function normalRange(type, { sensor, laboratory } = {}) {
  const key = type === "energy" ? "power" : type;
  const defaults = NORMAL_RANGES[key];
  if (!defaults) return null;
  const configuredCapacity = Number(laboratory?.capacity);
  const capacity = configuredCapacity > 0 ? configuredCapacity : defaults.max;
  const configuredMin = sensor?.warningMin == null ? NaN : Number(sensor.warningMin);
  const configuredMax = sensor?.warningMax == null ? NaN : Number(sensor.warningMax);
  return {
    ...defaults,
    min: Number.isFinite(configuredMin) ? configuredMin : defaults.min,
    max: Number.isFinite(configuredMax) ? configuredMax : key === "occupancy" ? capacity : defaults.max,
  };
}

export function normalState(value, range) {
  if (value == null || !Number.isFinite(Number(value)) || !range) return "unavailable";
  return Number(value) < range.min || Number(value) > range.max ? "outside" : "normal";
}
