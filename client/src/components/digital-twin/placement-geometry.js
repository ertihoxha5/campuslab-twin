const SNAP = .25;
const round = (value) => Math.round(value / SNAP) * SNAP;

export function sceneZoneFor(zone) {
  if (!zone) return null;
  if (Array.isArray(zone.center) && Array.isArray(zone.size)) return zone;
  return null;
}

export function snapPlacement(point, surface) {
  const position = { x: round(point.x), y: round(point.y), z: round(point.z) };
  if (surface === "floor") position.y = .08;
  if (surface === "ceiling") position.y = 2.72;
  return position;
}

export function validatePlacement({ position, zone, surface, placements = [], editingId = null }) {
  const mapped = sceneZoneFor(zone);
  if (!mapped) return { valid: false, reason: "Kjo zonë nuk ka planimetri 3D." };
  const halfX = mapped.size[0] / 2, halfZ = mapped.size[1] / 2;
  const margin=surface==="floor"?.35:.08;
  const inside = position.x >= mapped.center[0] - halfX+margin && position.x <= mapped.center[0] + halfX-margin
    && position.z >= mapped.center[1] - halfZ+margin && position.z <= mapped.center[1] + halfZ-margin;
  if (!inside) return { valid: false, reason: "Pika është jashtë zonës së zgjedhur." };
  if (surface === "wall") {
    const nearWall = Math.abs(position.x-(mapped.center[0]-halfX))<.45||Math.abs(position.x-(mapped.center[0]+halfX))<.45||Math.abs(position.z-(mapped.center[1]-halfZ))<.45||Math.abs(position.z-(mapped.center[1]+halfZ))<.45;
    if (!nearWall) return { valid: false, reason: "Zgjidh një sipërfaqe muri." };
  }
  const collision = placements.some((item) => String(item.id) !== String(editingId)
    && Math.hypot(Number(item.position?.x) - position.x, Number(item.position?.z) - position.z) < .65
    && Math.abs(Number(item.position?.y) - position.y) < .75);
  if (collision) return { valid: false, reason: "Pozita përplaset me një pajisje ekzistuese." };
  return { valid: true, reason: "Pozita është e vlefshme." };
}
