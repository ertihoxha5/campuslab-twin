const zoneColors = ["#6D4FA3", "#6E7A4F", "#3E8794", "#8B7047", "#A04B4B", "#5F6E82"];

const assetTypeAliases = [
  [/(robot|krahu)/i, "robot"],
  [/(network.?rack|server|rack)/i, "network-rack"],
  [/(rrjet|network|server)/i, "network-rack"],
  [/(storage.?rack|raft|shelf)/i, "storage-rack"],
  [/(workstation|stacion|computer|kompjuter)/i, "workstation"],
  [/(display|ekran|monitor)/i, "display"],
  [/(camera|kamer)/i, "camera"],
  [/(alarm.?panel|panel.*alarm)/i, "alarm-panel"],
  [/(emergency.?stop|estop)/i, "emergency-stop"],
];

export function buildDynamicScene({ zones = [], equipment = [], sensors = [], readings = {}, energy = {}, alerts = [] }) {
  const normalizedZones = normalizeZones(zones);
  const zoneById = new Map(normalizedZones.map((zone) => [String(zone.sourceId), zone]));
  const activeAlerts = alerts.filter((alert) => !["resolved", "closed"].includes(alert.status));
  const assets = equipment.map((item, index) => {
    const zone = zoneById.get(String(item.zoneId)) ?? normalizedZones[index % Math.max(normalizedZones.length, 1)];
    const type = normalizeAssetType(`${item.type ?? ""} ${item.name ?? ""} ${item.code ?? ""}`);
    const position = type === "robot" && zone ? [zone.center[0], 0, zone.center[1]] : positionInZone(zone, index, equipment.filter((candidate) => String(candidate.zoneId) === String(item.zoneId)).findIndex((candidate) => String(candidate.id) === String(item.id)));
    const alert = activeAlerts.find((candidate) => String(candidate.equipmentId) === String(item.id));
    const energyReading = energy[String(item.id)];
    return {
      ...item,
      id: String(item.id),
      apiId: String(item.id),
      name: item.name,
      code: item.code,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? "Pa zonë",
      type,
      position,
      energyWatts: Number(energyReading?.powerWatts ?? item.energyRatingWatts ?? 0),
      temperature: null,
      status: alert ? "alarm" : item.status === "fault" ? "alarm" : item.status === "maintenance" ? "maintenance" : item.status === "inactive" ? "offline" : "operational",
      maintenance: Number(item.healthScore ?? 100) < 70 ? "Kërkohet" : item.status === "maintenance" ? "Në proces" : "Në rregull",
      lastUpdate: energyReading?.recordedAt ?? item.updatedAt ?? new Date().toISOString(),
      alert: alert ?? null,
    };
  });
  const assetById = new Map(assets.map((asset) => [String(asset.apiId), asset]));
  const dynamicSensors = sensors.map((sensor, index) => {
    const zone = zoneById.get(String(sensor.zoneId)) ?? normalizedZones[index % Math.max(normalizedZones.length, 1)];
    const reading = readings[String(sensor.id)];
    const value = Number(reading?.value ?? baselineFor(sensor.sensorType));
    const linkedAsset = assetById.get(String(sensor.equipmentId));
    return {
      ...sensor,
      id: String(sensor.id),
      apiId: String(sensor.id),
      name: sensor.name,
      type: sensor.sensorType,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? "Pa zonë",
      assetId: linkedAsset?.id ?? null,
      position: sensorPosition(zone, index),
      value: Number.isFinite(value) ? value : 0,
      unit: sensor.unit ?? "",
      state: sensor.status === "offline" || sensor.status === "inactive" ? "offline" : thresholdState(sensor, value),
      lastUpdate: reading?.recordedAt ?? sensor.updatedAt ?? new Date().toISOString(),
    };
  });
  return { zones: normalizedZones, assets, sensors: dynamicSensors };
}

function normalizeZones(zones) {
  if (!zones.length) return [];
  const raw = zones.map((zone) => ({
    ...zone,
    x: Number(zone.position?.x ?? 0),
    z: Number(zone.position?.z ?? 0),
    width: Math.max(.5, Number(zone.dimensions?.width ?? 4)),
    depth: Math.max(.5, Number(zone.dimensions?.depth ?? 4)),
    height: Math.max(2.4, Number(zone.dimensions?.height ?? 3)),
  }));
  const minX = Math.min(...raw.map((zone) => zone.x));
  const minZ = Math.min(...raw.map((zone) => zone.z));
  const maxX = Math.max(...raw.map((zone) => zone.x + zone.width));
  const maxZ = Math.max(...raw.map((zone) => zone.z + zone.depth));
  const scale = Math.min(18 / Math.max(maxX - minX, 1), 11 / Math.max(maxZ - minZ, 1));
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return raw.map((zone, index) => ({
    ...zone,
    id: `zone-${zone.id}`,
    sourceId: String(zone.id),
    color: zoneColors[index % zoneColors.length],
    center: [(zone.x + zone.width / 2 - centerX) * scale, (zone.z + zone.depth / 2 - centerZ) * scale],
    size: [zone.width * scale, zone.depth * scale],
    wallHeight: Math.min(3.2, zone.height * scale),
  }));
}

function positionInZone(zone, globalIndex, localIndex) {
  if (!zone) return [0, 0, 0];
  const index = Math.max(0, localIndex);
  const columns = Math.max(1, Math.floor(zone.size[0] / 1.8));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const spacingX = Math.min(1.8, zone.size[0] / Math.max(columns, 1));
  const marginX = Math.min(.75, zone.size[0] * .22);
  const marginZ = Math.min(.75, zone.size[1] * .22);
  const minX = zone.center[0] - zone.size[0] / 2 + marginX;
  const maxX = zone.center[0] + zone.size[0] / 2 - marginX;
  const minZ = zone.center[1] - zone.size[1] / 2 + marginZ;
  const maxZ = zone.center[1] + zone.size[1] / 2 - marginZ;
  const x = zone.center[0] - zone.size[0] / 2 + .9 + column * spacingX;
  const z = zone.center[1] - zone.size[1] / 2 + 1 + row * 1.7;
  return [Number.isFinite(x) ? Math.max(minX, Math.min(maxX, x)) : globalIndex, 0, Math.max(minZ, Math.min(maxZ, z))];
}

function sensorPosition(zone, index) {
  if (!zone) return [0, 1.8, 0];
  const side = index % 4;
  if (side === 0) return [zone.center[0] - zone.size[0] / 2 + .15, 1.75, zone.center[1]];
  if (side === 1) return [zone.center[0] + zone.size[0] / 2 - .15, 1.75, zone.center[1]];
  if (side === 2) return [zone.center[0], 2.35, zone.center[1] - zone.size[1] / 2 + .15];
  return [zone.center[0], 2.35, zone.center[1] + zone.size[1] / 2 - .15];
}

function normalizeAssetType(value = "") {
  return assetTypeAliases.find(([pattern]) => pattern.test(value))?.[1] ?? "workstation";
}

function baselineFor(type) {
  return { temperature: 22, humidity: 45, co2: 450, occupancy: 0, smoke: 0, power: 0, voltage: 230, equipment_health: 100 }[type] ?? 0;
}

function thresholdState(sensor, value) {
  if ((sensor.criticalMin != null && value < Number(sensor.criticalMin)) || (sensor.criticalMax != null && value > Number(sensor.criticalMax))) return "alarm";
  if ((sensor.warningMin != null && value < Number(sensor.warningMin)) || (sensor.warningMax != null && value > Number(sensor.warningMax))) return "warning";
  return "normal";
}
