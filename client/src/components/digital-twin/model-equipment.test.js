import { describe, expect, it } from "vitest";
import { findEquipmentByObjectNames } from "./model-equipment.js";

describe("findEquipmentByObjectNames", () => {
  it("matches an exact mesh or parent group reference safely", () => {
    const equipment = [
      { id: "8", object3dReference: "PLC_Main" },
      { id: "9", object3dReference: "Server_Rack" },
    ];
    expect(findEquipmentByObjectNames(["Mesh_01", "PLC_Main"], equipment)?.id).toBe(
      "8",
    );
  });

  it("does not bind equipment without an explicit 3D reference", () => {
    expect(findEquipmentByObjectNames(["Mesh_01"], [{ id: "8" }])).toBeUndefined();
  });
});
