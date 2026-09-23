import { Box3, Vector3 } from "three";

export function modelTransform(object, height, ground = true) {
  const bounds = new Box3().setFromObject(object);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = height / Math.max(size.y, .001);
  return {
    scale,
    offset: [-center.x, ground ? -bounds.min.y : -center.y, -center.z],
  };
}
