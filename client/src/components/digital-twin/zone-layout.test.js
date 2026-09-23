import { describe, expect, it } from "vitest";
import { buildDynamicScene } from "./dynamic-scene.js";
import { rackSlots, workstationSlots, zoneKind } from "./zone-layout.js";

describe("laboratory-specific equipment layout", () => {
  it("recognizes classroom, storage and robotics zones", () => {
    expect(zoneKind({ name: "Zona e Mësimit" })).toBe("classroom");
    expect(zoneKind({ name: "Depoja e Pajisjeve" })).toBe("storage");
    expect(zoneKind({ name: "Zona e Robotikës" })).toBe("robotics");
  });

  it("puts database workstations in the same slots as supplemental furniture", () => {
    const scene = buildDynamicScene({
      zones: [{ id: 2, name: "Zona e Mësimit", code: "MESIM", position: { x: 0, z: 0 }, dimensions: { width: 10, depth: 7, height: 3 } }],
      equipment: [
        { id: 10, zoneId: 2, name: "Kompjuter 1", type: "computer" },
        { id: 11, zoneId: 2, name: "Kompjuter 2", type: "computer" },
      ],
    });
    const zone = scene.zones[0];
    const slots = workstationSlots(zone);
    expect(scene.assets[0].position).toEqual([zone.center[0] + slots[0].x * zone.size[0], 0, zone.center[1] + slots[0].z * zone.size[1]]);
    expect(scene.assets[1].position).toEqual([zone.center[0] + slots[1].x * zone.size[0], 0, zone.center[1] + slots[1].z * zone.size[1]]);
    expect(slots).toHaveLength(6);
  });

  it("arranges storage racks in one horizontal row", () => {
    const zone = { name: "Depoja e Pajisjeve", size: [6, 4], center: [0, 0] };
    const slots = rackSlots(zone, "storage-rack");
    expect(slots).toHaveLength(3);
    expect(new Set(slots.map((slot) => slot.z)).size).toBe(1);
    const scene = buildDynamicScene({
      zones: [{ id: 4, name: zone.name, position: { x: 0, z: 0 }, dimensions: { width: 6, depth: 4, height: 3 } }],
      equipment: [{ id: 44, zoneId: 4, name: "Rafti i inventarit", type: "storage-rack" }],
    });
    expect(scene.assets[0].type).toBe("storage-rack");
  });
});
