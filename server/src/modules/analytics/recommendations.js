const rules = Object.freeze({
  temperature: [
    maximumRule(
      "temperature.high",
      "Temperaturë e lartë",
      28,
      "°C",
      "high",
      "Kontrolloni ventilimin, ngarkesën termike dhe pajisjet aktive.",
    ),
    minimumRule(
      "temperature.low",
      "Temperaturë e ulët",
      16,
      "°C",
      "low",
      "Kontrolloni ngrohjen dhe kalibrimin e sensorit të temperaturës.",
    ),
  ],
  humidity: [
    maximumRule(
      "humidity.high",
      "Lagështi e lartë",
      70,
      "%",
      "high",
      "Kontrolloni ventilimin dhe burimet e lagështisë.",
    ),
    minimumRule(
      "humidity.low",
      "Lagështi e ulët",
      30,
      "%",
      "low",
      "Kontrolloni kushtet e ajrit dhe pajisjet e ndjeshme ndaj ajrit të thatë.",
    ),
  ],
  co2: [
    maximumRule(
      "co2.high",
      "CO₂ mbi pragun e rekomanduar",
      1000,
      "ppm",
      "high",
      "Rritni ajrosjen dhe verifikoni funksionimin e ventilimit.",
    ),
  ],
  occupancy: [
    maximumRule(
      "occupancy.high",
      "Occupancy i lartë",
      30,
      "persona",
      "high",
      "Verifikoni kapacitetin e laboratorit dhe kufizoni hyrjet kur tejkalohet.",
    ),
  ],
  smoke: [
    maximumRule(
      "smoke.detected",
      "U detektua tym",
      1,
      "%",
      "high",
      "Kontrolloni menjëherë laboratorin dhe procedurat e sigurisë.",
    ),
  ],
  equipment_health: [
    minimumRule(
      "equipment_health.low",
      "Shëndet i ulët i pajisjeve",
      70,
      "%",
      "low",
      "Planifikoni inspektim dhe mirëmbajtje për pajisjet e prekura.",
    ),
  ],
  alerts: [
    valueRule(
      "alerts.frequent",
      "Numër i lartë alarmesh",
      5,
      "alarme",
      "high",
      "Analizoni alarmet e përsëritura dhe burimin e tyre kryesor.",
    ),
  ],
  maintenance: [
    valueRule(
      "maintenance.frequent",
      "Ngarkesë e lartë mirëmbajtjeje",
      10,
      "detyra",
      "high",
      "Rishikoni planin, prioritetet dhe burimet teknike të mirëmbajtjes.",
    ),
  ],
});

export function buildRuleBasedRecommendations({ metric, summary }) {
  if (!summary || Number(summary.samples) === 0) return [];
  if (metric === "power") return powerRecommendations(summary);
  return (rules[metric] ?? []).flatMap((rule) => rule(summary) ?? []);
}

function powerRecommendations(summary) {
  const average = Number(summary.value ?? 0);
  const maximum = Number(summary.maximum ?? 0);
  const threshold = average * 1.5;
  if (average <= 0 || maximum <= threshold) return [];
  return [
    recommendation({
      ruleId: "power.peak_ratio",
      title: "Kulm i lartë i fuqisë",
      severity: "medium",
      observed: maximum,
      operator: ">",
      threshold: round(threshold),
      unit: "W",
      samples: summary.samples,
      action:
        "Shpërndani ndezjen e pajisjeve me konsum të lartë në orare të ndryshme.",
      explanation: `Fuqia maksimale ${round(maximum)} W është mbi 1.5× mesataren ${round(average)} W.`,
    }),
  ];
}

function maximumRule(ruleId, title, threshold, unit, direction, action) {
  return (summary) => {
    const observed = Number(summary.maximum);
    const triggered =
      direction === "high" ? observed > threshold : observed < threshold;
    if (!Number.isFinite(observed) || !triggered) return null;
    return [
      recommendation({
        ruleId,
        title,
        severity: direction === "high" ? "high" : "medium",
        observed,
        operator: direction === "high" ? ">" : "<",
        threshold,
        unit,
        samples: summary.samples,
        action,
      }),
    ];
  };
}

function minimumRule(ruleId, title, threshold, unit, direction, action) {
  return (summary) => {
    const observed = Number(summary.minimum);
    const triggered =
      direction === "low" ? observed < threshold : observed > threshold;
    if (!Number.isFinite(observed) || !triggered) return null;
    return [
      recommendation({
        ruleId,
        title,
        severity: "medium",
        observed,
        operator: direction === "low" ? "<" : ">",
        threshold,
        unit,
        samples: summary.samples,
        action,
      }),
    ];
  };
}

function valueRule(ruleId, title, threshold, unit, direction, action) {
  return (summary) => {
    const observed = Number(summary.value);
    if (!Number.isFinite(observed) || observed < threshold) return null;
    return [
      recommendation({
        ruleId,
        title,
        severity: direction === "high" ? "medium" : "low",
        observed,
        operator: ">=",
        threshold,
        unit,
        samples: summary.samples,
        action,
      }),
    ];
  };
}

function recommendation({ explanation, ...item }) {
  return {
    ruleId: item.ruleId,
    title: item.title,
    severity: item.severity,
    explanation:
      explanation ??
      `Vlera e matur ${round(item.observed)} ${item.unit} ${item.operator} pragu ${round(item.threshold)} ${item.unit}.`,
    evidence: {
      observed: round(item.observed),
      operator: item.operator,
      threshold: round(item.threshold),
      unit: item.unit,
      samples: Number(item.samples),
    },
    action: item.action,
  };
}

function round(value) {
  return Number(Number(value).toFixed(2));
}
