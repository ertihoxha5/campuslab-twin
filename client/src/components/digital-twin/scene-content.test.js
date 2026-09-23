import { describe, expect, it } from "vitest";
import { visibleSceneContent } from "./scene-content.js";

describe("Digital Twin visible content", () => {
  it("does not draw both the auto model and a linked placement", () => {
    const result = visibleSceneContent(
      [{ id: "7", apiId: "7" }, { id: "8", apiId: "8" }],
      [{ id: "p1", parentEquipmentId: 7 }, { id: "p2", parentEquipmentId: "7" }, { id: "p3", parentEquipmentId: null }],
    );
    expect(result.assets.map((asset) => asset.id)).toEqual(["8"]);
    expect(result.placements.map((item) => item.id)).toEqual(["p1", "p3"]);
  });
});
