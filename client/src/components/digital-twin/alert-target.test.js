import { describe, expect, it } from "vitest";
import { resolveAlertTarget } from "./alert-target.js";

describe("resolveAlertTarget", () => {
  it("focuses the stored sensor coordinates", () => {
    expect(
      resolveAlertTarget(
        { sensorId: "4" },
        [{ id: "4", positionX: 2, positionY: 1.2, positionZ: -1 }],
        [],
        [],
      ),
    ).toEqual([2, 1.45, -1]);
  });

  it("uses the laboratory center for an unbound alert", () => {
    expect(resolveAlertTarget({}, [], [], [])).toEqual([0, 1.4, 0]);
  });
});
