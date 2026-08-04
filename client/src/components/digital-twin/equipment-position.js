export function equipmentMarkerPosition(equipment, zones, index) {
  const zone = zones.find((item) => String(item.id) === String(equipment.zoneId));
  if (zone) {
    const offset = ((index % 5) - 2) * 0.32;
    return [
      Number(zone.position?.x ?? 0) + offset,
      Number(zone.position?.y ?? 0) + 0.42,
      Number(zone.position?.z ?? 0),
    ];
  }
  return [-5.4 + (index % 4) * 1.1, 0.45, 3.55 - Math.floor(index / 4) * 0.75];
}
