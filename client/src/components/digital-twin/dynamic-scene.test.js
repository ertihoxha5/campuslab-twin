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
});
