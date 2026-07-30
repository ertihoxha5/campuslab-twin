const defaultRanges = Object.freeze({
  temperature: [10, 45],
  humidity: [15, 90],
  co2: [350, 5000],
  occupancy: [0, 500],
  smoke: [0, 100],
  power: [0, 1000000],
  voltage: [180, 260],
  equipment_health: [0, 100],
});

const defaultValues = Object.freeze({
  temperature: 22,
  humidity: 45,
  co2: 450,
  occupancy: 0,
  smoke: 0,
  power: 0,
  voltage: 230,
  equipment_health: 100,
});

const maximumStep = Object.freeze({
  temperature: 0.25,
  humidity: 0.6,
  co2: 40,
  occupancy: 1,
  smoke: 0.2,
  power: 500,
  voltage: 0.8,
  equipment_health: 0.12,
});

export function createInitialSimulationState(configuration = {}) {
  const initial = configuration.initialValues ?? {};
  return {
    tick: 0,
    values: Object.fromEntries(
      Object.keys(defaultValues).map((type) => [
        type,
        clampToRange(
          numberOr(initial[type], defaultValues[type]),
          configuredRange(configuration, type),
        ),
      ]),
    ),
  };
}

export function generateSimulationStep({
  seed,
  sensors,
  previousState,
  configuration = {},
  recordedAt,
}) {
  const state = previousState ?? createInitialSimulationState(configuration);
  const tick = Number(state.tick) + 1;
  const random = seededRandom(`${seed}:${tick}`);
  const event = activeEvent(configuration.abnormalEvent, tick);
  const targets = calculateTargets({
    configuration,
    event,
    previousValues: state.values,
    random,
  });
  const values = {};

  for (const type of Object.keys(defaultValues)) {
    const range = configuredRange(configuration, type);
    const dynamicStep = maximumDelta(type, configuration, event);
    const noise = noiseFor(type, random);
    const next = approach(
      numberOr(state.values[type], defaultValues[type]),
      targets[type] + noise,
      dynamicStep,
    );
    values[type] =
      type === "occupancy"
        ? Math.round(clampToRange(next, range))
        : round(clampToRange(next, range), 4);
  }

  const timestamp = normalizeTimestamp(recordedAt);
  const readings = sensors
    .filter((sensor) => Object.hasOwn(values, sensor.sensorType))
    .map((sensor) => {
      const sensorNoise =
        (seededRandom(`${seed}:${tick}:${sensor.id}`)() - 0.5) *
        sensorNoiseAmplitude(sensor.sensorType);
      const value =
        sensor.sensorType === "occupancy"
          ? values.occupancy
          : round(
              clampToRange(
                values[sensor.sensorType] + sensorNoise,
                configuredRange(configuration, sensor.sensorType),
              ),
              4,
            );
      return {
        sensorId: String(sensor.id),
        sensorType: sensor.sensorType,
        unit: sensor.unit,
        value,
        recordedAt: timestamp,
        source: "simulated",
      };
    });

  return {
    state: { tick, values },
    readings,
    event: event ? { type: event.type, tick } : null,
  };
}

function calculateTargets({ configuration, event, previousValues, random }) {
  const capacity = Math.max(1, numberOr(configuration.occupancyCapacity, 30));
  const configuredOccupancy = clamp(
    numberOr(configuration.baselineOccupancy, 0),
    0,
    capacity,
  );
  const equipmentLoad = clamp(
    numberOr(configuration.equipmentLoad, 0.45),
    0,
    1,
  );
  const equipmentWatts = Math.max(
    0,
    numberOr(configuration.activeEquipmentWatts, 3000),
  );
  let ventilation = clamp(
    numberOr(configuration.ventilationEfficiency, 0.65),
    0,
    1,
  );
  let occupancy = configuredOccupancy;
  let powerMultiplier = 1;
  let smokeTarget = 0;
  let temperatureOffset = 0;

  if (event) {
    const intensity = clamp(numberOr(event.intensity, 1), 0.1, 10);
    if (event.type === "ventilation_failure") ventilation = 0;
    if (event.type === "overcapacity") {
      occupancy = Math.min(capacity * (1 + 0.25 * intensity), 500);
    }
    if (event.type === "smoke_incident") smokeTarget = 12 * intensity;
    if (event.type === "power_spike") powerMultiplier += 0.65 * intensity;
    if (event.type === "temperature_rise") temperatureOffset = 5 * intensity;
  }

  const health = numberOr(previousValues.equipment_health, 100);
  const degradationPenalty = (100 - health) / 100;
  const ambientTemperature = numberOr(configuration.ambientTemperature, 21);
  const outdoorCo2 = numberOr(configuration.outdoorCo2, 420);
  const baseHumidity = numberOr(configuration.baseHumidity, 44);
  const naturalCycle = Math.sin((Number(previousValues.co2) + random()) * 0.01);

  return {
    occupancy,
    temperature:
      ambientTemperature +
      occupancy * 0.08 +
      equipmentLoad * 3.2 -
      ventilation * 1.8 +
      temperatureOffset +
      naturalCycle * 0.15,
    humidity:
      baseHumidity + occupancy * 0.16 - ventilation * 2.5 + random() * 0.4,
    co2:
      outdoorCo2 +
      occupancy * 38 * (1 - ventilation * 0.72) +
      equipmentLoad * 30,
    smoke: smokeTarget,
    power:
      equipmentWatts *
      equipmentLoad *
      (1 + degradationPenalty * 0.22) *
      powerMultiplier,
    voltage:
      numberOr(configuration.nominalVoltage, 230) -
      equipmentLoad * 2.2 -
      (powerMultiplier - 1) * 7,
    equipment_health: healthTarget({
      configuration,
      event,
      health,
      equipmentLoad,
    }),
  };
}

function healthTarget({ configuration, event, health, equipmentLoad }) {
  const degradation =
    Math.max(0, numberOr(configuration.degradationPerStep, 0.015)) *
    (0.5 + equipmentLoad);
  const failure =
    event?.type === "equipment_failure"
      ? 1.4 * clamp(numberOr(event.intensity, 1), 0.1, 10)
      : 0;
  return health - degradation - failure;
}

function maximumDelta(type, configuration, event) {
  const configured = configuration.maximumStep?.[type];
  if (Number.isFinite(Number(configured)) && Number(configured) > 0) {
    return Number(configured);
  }
  if (event?.type === "smoke_incident" && type === "smoke") return 4;
  if (event?.type === "equipment_failure" && type === "equipment_health") {
    return 2;
  }
  if (event?.type === "power_spike" && type === "power") return 2500;
  return maximumStep[type];
}

function noiseFor(type, random) {
  const amplitude = {
    temperature: 0.06,
    humidity: 0.2,
    co2: 5,
    occupancy: 0.15,
    smoke: 0.01,
    power: 25,
    voltage: 0.18,
    equipment_health: 0.005,
  }[type];
  return (random() - 0.5) * 2 * amplitude;
}

function sensorNoiseAmplitude(type) {
  return (
    {
      temperature: 0.03,
      humidity: 0.08,
      co2: 1.5,
      smoke: 0.005,
      power: 4,
      voltage: 0.04,
      equipment_health: 0.01,
    }[type] ?? 0
  );
}

function activeEvent(event, tick) {
  if (!event?.type) return null;
  const startTick = Math.max(1, Number(event.startTick) || 1);
  const duration = Math.max(1, Number(event.durationTicks) || 1);
  return tick >= startTick && tick < startTick + duration ? event : null;
}

function configuredRange(configuration, type) {
  const range = configuration.ranges?.[type];
  if (
    Array.isArray(range) &&
    range.length === 2 &&
    Number.isFinite(Number(range[0])) &&
    Number.isFinite(Number(range[1])) &&
    Number(range[0]) < Number(range[1])
  ) {
    return [Number(range[0]), Number(range[1])];
  }
  return defaultRanges[type];
}

function seededRandom(seed) {
  let value = hashSeed(String(seed));
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function approach(current, target, maximumChange) {
  return current + clamp(target - current, -maximumChange, maximumChange);
}

function clampToRange(value, [minimum, maximum]) {
  return clamp(value, minimum, maximum);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, precision) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Koha e leximit nuk është e vlefshme.");
  }
  return date.toISOString();
}
