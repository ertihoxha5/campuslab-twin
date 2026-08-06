import { describe, expect, it } from "vitest";
import { occupancyRepresentation } from "./occupancy.js";

describe("occupancyRepresentation", () => {
  it("shows one figure per person for small occupancy", () => {
    expect(occupancyRepresentation(6)).toEqual({
      total: 6,
      visible: 6,
      aggregated: false,
      peoplePerFigure: 1,
    });
  });

  it("limits figures and explains aggregated occupancy", () => {
    expect(occupancyRepresentation(37)).toEqual({
      total: 37,
      visible: 16,
      aggregated: true,
      peoplePerFigure: 3,
    });
  });
});
