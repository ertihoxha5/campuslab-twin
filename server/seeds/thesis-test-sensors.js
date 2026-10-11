// Dedicated, opt-in Chapter 6 fixture. These are not platform-wide alert defaults.
export const thesisTestSensors = Object.freeze([
  Object.freeze({
    code: "CLT-THESIS-TEMP",
    name: "Temperatura e laboratorit",
    sensorType: "temperature",
    unit: "°C",
    warningMin: 18,
    warningMax: 27,
    criticalMin: null,
    criticalMax: 32,
  }),
  Object.freeze({
    code: "CLT-THESIS-HUM",
    name: "Lagështia e laboratorit",
    sensorType: "humidity",
    unit: "%",
    warningMin: 30,
    warningMax: 60,
    criticalMin: null,
    // The rule engine uses > and the column has four decimal places.
    criticalMax: 71.9999,
  }),
  Object.freeze({
    code: "CLT-THESIS-OCC",
    name: "Prania në laborator",
    sensorType: "occupancy",
    unit: "persona",
    warningMin: null,
    warningMax: 25,
    criticalMin: null,
    criticalMax: 29,
  }),
  Object.freeze({
    code: "CLT-THESIS-POWER",
    name: "Fuqia e laboratorit",
    sensorType: "power",
    unit: "W",
    warningMin: 500,
    warningMax: 5000,
    criticalMin: null,
    criticalMax: 6999.9999,
  }),
]);

export const thesisTestCases = Object.freeze([
  Object.freeze({ key: "normal", values: Object.freeze({ temperature: 23, humidity: 45, occupancy: 10, power: 2000 }), expected: "Normal" }),
  Object.freeze({ key: "high_temperature", values: Object.freeze({ temperature: 29 }), expected: "Warning" }),
  Object.freeze({ key: "high_humidity", values: Object.freeze({ humidity: 70 }), expected: "Warning" }),
  Object.freeze({ key: "overcapacity", values: Object.freeze({ occupancy: 30 }), expected: "Critical" }),
  Object.freeze({ key: "high_power", values: Object.freeze({ power: 7000 }), expected: "Critical" }),
  Object.freeze({ key: "equipment_fault", values: Object.freeze({}), expected: "Problem state only" }),
]);
