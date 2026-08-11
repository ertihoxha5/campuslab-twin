export const operationalStatusLabels = {
  active: "Aktiv",
  inactive: "Joaktiv",
  fault: "Me defekt",
  online: "Online",
  offline: "Offline",
  maintenance: "Në mirëmbajtje",
  archived: "Arkivuar",
  new: "I ri",
  acknowledged: "I pranuar",
  in_progress: "Në trajtim",
  resolved: "I zgjidhur",
  closed: "I mbyllur",
};

export const sensorTypeLabels = {
  temperature: "Temperaturë",
  humidity: "Lagështi",
  occupancy: "Prani",
  air_quality: "Cilësi e ajrit",
  light: "Ndriçim",
  smoke: "Tym",
  energy: "Energji",
  pressure: "Presion",
  noise: "Zhurmë",
  motion: "Lëvizje",
};

export const sourceLabels = {
  simulated: "Simuluar",
  physical: "Fizik",
  recorded: "Regjistruar",
  manual: "Manual",
};

export function localizedLabel(labels, value, fallback = "E panjohur") {
  if (value == null || value === "") return fallback;
  return labels[value] ?? fallback;
}
