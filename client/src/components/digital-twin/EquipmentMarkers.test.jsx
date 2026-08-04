import { describe, expect, it } from "vitest";
import { equipmentMarkerPosition } from "./equipment-position.js";

describe("equipmentMarkerPosition", () => {
  it("uses the stored nested zone position", () => {
    const position = equipmentMarkerPosition(
      { id: "4", zoneId: "8" },
      [{ id: "8", position: { x: 2, y: 0.5, z: -1 } }],
      2,
    );
    expect(position[0]).toBe(2);
    expect(position[1]).toBeCloseTo(0.92);
    expect(position[2]).toBe(-1);
  });
});
