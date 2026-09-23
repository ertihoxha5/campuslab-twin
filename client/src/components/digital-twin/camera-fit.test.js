import { describe, expect, it } from "vitest";
import { fitLaboratoryZoom } from "./camera-fit.js";

const zones = [
  { center: [-4, 0], size: [8, 6] },
  { center: [4, 0], size: [8, 6] },
];

describe("Digital Twin camera framing", () => {
  it("zooms out when the viewer narrows", () => {
    expect(fitLaboratoryZoom(zones, { width: 620, height: 600 })).toBeLessThan(fitLaboratoryZoom(zones, { width: 1200, height: 700 }));
  });

  it("uses the actual dimensions of the selected laboratory", () => {
    expect(fitLaboratoryZoom(zones, { width: 1200, height: 700 })).toBeLessThan(fitLaboratoryZoom([{ center: [0, 0], size: [5, 4] }], { width: 1200, height: 700 }));
  });
});
