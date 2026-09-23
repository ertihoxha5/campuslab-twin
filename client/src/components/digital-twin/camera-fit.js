export function fitLaboratoryZoom(zones, viewport, mode = "overview") {
  if (!zones.length || !viewport.width || !viewport.height) return 54;
  const minX = Math.min(...zones.map((zone) => zone.center[0] - zone.size[0] / 2));
  const maxX = Math.max(...zones.map((zone) => zone.center[0] + zone.size[0] / 2));
  const minZ = Math.min(...zones.map((zone) => zone.center[1] - zone.size[1] / 2));
  const maxZ = Math.max(...zones.map((zone) => zone.center[1] + zone.size[1] / 2));
  const width = maxX - minX + .7;
  const depth = maxZ - minZ + .7;
  const projectedWidth = mode === "top" ? width : (width + depth) * Math.SQRT1_2;
  const projectedHeight = mode === "top" ? depth : (width + depth) * .34 + 2.7;
  const margin = mode === "top" ? 1.12 : 1.08;
  return Math.max(12, Math.min(90, viewport.width / (projectedWidth * margin), viewport.height / (projectedHeight * margin)));
}
