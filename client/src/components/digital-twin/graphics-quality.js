export function resolveGraphicsQuality(preference, capabilities = {}) {
  if (["high", "low"].includes(preference)) return preference;
  const {
    hardwareConcurrency = 8,
    deviceMemory = 8,
    reducedMotion = false,
  } = capabilities;
  return reducedMotion || hardwareConcurrency <= 4 || deviceMemory <= 4
    ? "low"
    : "high";
}
