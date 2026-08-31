import { describe, expect, it } from "vitest";
import { buildDynamicScene } from "./dynamic-scene.js";

describe("dynamic laboratory scene", () => {
  it("builds different geometry and objects from each laboratory dataset", () => {
    const first = buildDynamicScene({ zones: [{ id: 1, name: "Robotika", position: { x: 0, z: 0 }, dimensions: { width: 8, depth: 6, height: 3 } }], equipment: [{ id: 7, zoneId: 1, name: "Robot", code: "R-1", type: "robot", status: "active" }], sensors: [] });
    const second = buildDynamicScene({ zones: [{ id: 2, name: "Rrjetet", position: { x: 10, z: 4 }, dimensions: { width: 4, depth: 3, height: 3 } }], equipment: [], sensors: [] });
    expect(first.zones[0].sourceId).toBe("1");
    expect(first.assets[0]).toMatchObject({ apiId: "7", type: "robot", zoneId: "zone-1" });
    expect(second.zones[0].sourceId).toBe("2");
    expect(second.assets).toHaveLength(0);
  });

  it("mounts robotics sensors on the zone wall instead of beside the robot", () => {
    const scene = buildDynamicScene({
      zones: [{ id: 1, name: "Zona e Robotikës", position: { x: 0, z: 0 }, dimensions: { width: 8, depth: 6, height: 3 } }],
      equipment: [{ id: 7, zoneId: 1, name: "Krahu robotik", type: "robot" }],
      sensors: [{ id: 9, zoneId: 1, equipmentId: 7, name: "Temperatura", sensorType: "temperature" }],
    });
    const zone=scene.zones[0];
    expect(scene.sensors[0].position[0]).toBeCloseTo(zone.center[0]+zone.size[0]/2-.11);
    expect(scene.sensors[0].position[1]).toBe(1.55);
    expect(scene.sensors[0].position).not.toEqual([scene.assets[0].position[0],1.15,scene.assets[0].position[2]+.18]);
  });
});
