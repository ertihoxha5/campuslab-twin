export const TWIN_COLORS = {
  charcoal: "#252B37",
  offWhite: "#F4F3F1",
  olive: "#6E7A4F",
  purple: "#6D4FA3",
  cyan: "#43D4E8",
  normal: "#4FD18B",
  warning: "#E0A43A",
  danger: "#D64C4C",
};

export const TWIN_ZONES = [
  { id: "control", name: "Zona e Kontrollit", code: "KONTROLL-01", center: [-6, 3.5], size: [7, 6], color: "#6D4FA3" },
  { id: "robotics", name: "Zona e Robotikës", code: "ROBOT-01", center: [2.25, 3.5], size: [8.5, 6], color: "#E0A43A" },
  { id: "teaching", name: "Zona e Mësimit", code: "MESIM-01", center: [-6, -3.5], size: [7, 5], color: "#43A2B2" },
  { id: "storage", name: "Depoja e Pajisjeve", code: "DEPO-01", center: [0, -3.5], size: [5, 5], color: "#8B7047" },
  { id: "safety", name: "Zona e Sigurisë", code: "SIGURI-01", center: [5.75, -3.5], size: [5.5, 5], color: "#B44B4B" },
];

export const CAMERA_PRESETS = {
  overview: { position: [15.5, 17, 17.5], target: [0, 0.4, 0], fov: 42 },
  top: { position: [0, 25, 0.01], target: [0, 0, 0], fov: 40 },
  focus: { position: [6, 6, 7], target: [0, 0.8, 0], fov: 44 },
};

export const STATIC_ASSETS = [
  { id: "CTRL-WS-01", name: "Stacioni i operatorit 01", zoneId: "control", type: "workstation", position: [-7.2, 0, 3.2], energyWatts: 380 },
  { id: "CTRL-WS-02", name: "Stacioni i operatorit 02", zoneId: "control", type: "workstation", position: [-4.9, 0, 3.2], energyWatts: 365 },
  { id: "NET-RACK-01", name: "Rack-u kryesor i rrjetit", zoneId: "control", type: "network-rack", position: [-8.4, 0, 5.1], energyWatts: 940 },
  { id: "ROBOT-UR5E", name: "Krahu robotik UR5e", zoneId: "robotics", type: "robot", position: [1.3, 0, 3.5], energyWatts: 1240 },
  { id: "VISION-01", name: "Kamera machine-vision", zoneId: "robotics", type: "camera", position: [3.5, 1.65, 4.3], energyWatts: 38 },
  { id: "ESTOP-01", name: "Butoni i emergjencës", zoneId: "robotics", type: "emergency-stop", position: [4.2, 0, 1.2], energyWatts: 2 },
  { id: "STORE-RACK-01", name: "Rafti i inventarit A", zoneId: "storage", type: "storage-rack", position: [-1, 0, -3.6], energyWatts: 0 },
  { id: "STORE-RACK-02", name: "Rafti i inventarit B", zoneId: "storage", type: "storage-rack", position: [1, 0, -3.6], energyWatts: 0 },
  { id: "SAFETY-PANEL-01", name: "Paneli i alarmit", zoneId: "safety", type: "alarm-panel", position: [7.1, 0, -4.8], energyWatts: 18 },
  { id: "CLASS-DISPLAY-01", name: "Ekrani interaktiv", zoneId: "teaching", type: "display", position: [-8.4, 0, -5.85], energyWatts: 210 },
];

export const SENSOR_DEFINITIONS = [
  { id: "TEMP-CONTROL", name: "Temperatura e kontrollit", zoneId: "control", type: "temperature", position: [-3.05, 1.75, 5.5], unit: "°C", base: 22.2 },
  { id: "ENERGY-ROBOT", name: "Matësi i energjisë së robotit", zoneId: "robotics", assetId: "ROBOT-UR5E", type: "energy", position: [4.7, 1.45, 5.5], unit: "W", base: 1240 },
  { id: "ENV-CLASS", name: "Sensori ambiental", zoneId: "teaching", type: "humidity", position: [-3.05, 1.75, -5.6], unit: "%", base: 48 },
  { id: "OCC-CLASS", name: "Sensori i pranisë", zoneId: "teaching", type: "occupancy", position: [-6, 2.5, -5.5], unit: "persona", base: 0 },
  { id: "SMOKE-SAFETY", name: "Detektori i tymit", zoneId: "safety", type: "smoke", position: [5.7, 2.55, -4.2], unit: "%", base: 0 },
  { id: "DOOR-SAFETY", name: "Sensori i derës emergjente", zoneId: "safety", type: "door", position: [8.35, 1.4, -3.3], unit: "", base: 0 },
  { id: "STATUS-RACK", name: "Monitorimi i rack-ut", zoneId: "control", assetId: "NET-RACK-01", type: "status", position: [-8.4, 1.8, 5.45], unit: "%", base: 98 },
];
