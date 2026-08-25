import { TWIN_ZONES } from "./twin-config.js";

const SNAP = .25;
const round = (value) => Math.round(value / SNAP) * SNAP;

export function sceneZoneFor(zone) {
  if (!zone) return null;
  const code = String(zone.code ?? "").toUpperCase();
  return TWIN_ZONES.find((item) => item.code === code)
    ?? TWIN_ZONES.find((item) => String(zone.name ?? "").toLowerCase().includes(item.id))
    ?? null;
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
  const inside = position.x >= mapped.center[0] - halfX && position.x <= mapped.center[0] + halfX
    && position.z >= mapped.center[1] - halfZ && position.z <= mapped.center[1] + halfZ;
  if (!inside) return { valid: false, reason: "Pika është jashtë zonës së zgjedhur." };
  if (surface === "wall") {
    const nearWall = Math.abs(Math.abs(position.x) - 9.65) < .45 || Math.abs(Math.abs(position.z) - 6.05) < .45;
    if (!nearWall) return { valid: false, reason: "Zgjidh një sipërfaqe muri." };
  }
  const collision = placements.some((item) => String(item.id) !== String(editingId)
    && Math.hypot(Number(item.position?.x) - position.x, Number(item.position?.z) - position.z) < .65
    && Math.abs(Number(item.position?.y) - position.y) < .75);
  if (collision) return { valid: false, reason: "Pozita përplaset me një pajisje ekzistuese." };
  return { valid: true, reason: "Pozita është e vlefshme." };
}
