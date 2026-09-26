import { describe, expect, it } from "vitest";
import { normalRange, normalState } from "./monitoring-standards.js";

describe("monitoring standards", () => {
  it("uses the documented simulated normal intervals", () => {
    expect(normalRange("temperature")).toMatchObject({ min: 18, max: 26 });
    expect(normalRange("humidity")).toMatchObject({ min: 30, max: 60 });
    expect(normalRange("occupancy")).toMatchObject({ min: 0, max: 25 });
    expect(normalRange("power")).toMatchObject({ min: 500, max: 5000 });
  });

  it("prefers configured sensor limits and laboratory capacity", () => {
    expect(normalRange("temperature", { sensor: { warningMin: 19, warningMax: 24 } })).toMatchObject({ min: 19, max: 24 });
    expect(normalRange("occupancy", { laboratory: { capacity: 18 } })).toMatchObject({ min: 0, max: 18 });
  });

  it("does not interpret absent readings as normal", () => {
    expect(normalState(null, normalRange("temperature"))).toBe("unavailable");
    expect(normalState(27, normalRange("temperature"))).toBe("outside");
    expect(normalState(24, normalRange("temperature"))).toBe("normal");
  });
});
