export const FIRST_PERSON_START = { x: 0, y: 1.65, z: 3.65 };

const boundaries = { minX: -6.55, maxX: 6.55, minZ: -4.05, maxZ: 4.05 };
const workstationCenters = [
  [-3.8, -1.9],
  [0, -1.9],
  [3.8, -1.9],
  [-3.8, 1.25],
  [0, 1.25],
  [3.8, 1.25],
];
const colliders = [
  ...workstationCenters.map(([x, z]) => ({
    minX: x - 1.55,
    maxX: x + 1.55,
    minZ: z - 0.75,
    maxZ: z + 1.2,
  })),
  { minX: -6.65, maxX: -5.15, minZ: -4.1, maxZ: -3.05 },
];

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

function isBlocked(x, z) {
  const radius = 0.22;
  return colliders.some(
    (box) =>
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ,
  );
}

export function resolveFirstPersonMove(position, movement) {
  const targetX = clamp(
    position.x + movement.x,
    boundaries.minX,
    boundaries.maxX,
  );
  const targetZ = clamp(
    position.z + movement.z,
    boundaries.minZ,
    boundaries.maxZ,
  );

  if (!isBlocked(targetX, targetZ)) {
    return { x: targetX, y: FIRST_PERSON_START.y, z: targetZ };
  }
  if (!isBlocked(targetX, position.z)) {
    return { x: targetX, y: FIRST_PERSON_START.y, z: position.z };
  }
  if (!isBlocked(position.x, targetZ)) {
    return { x: position.x, y: FIRST_PERSON_START.y, z: targetZ };
  }
  return { x: position.x, y: FIRST_PERSON_START.y, z: position.z };
}
