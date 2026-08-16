import { describe, expect, it } from "vitest";
import { occupancyRepresentation, resolveOccupancy, scheduledOccupancy } from "./occupancy.js";

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

describe("scheduledOccupancy", () => {
  it("keeps the laboratory empty late at night", () => {
    expect(scheduledOccupancy(new Date("2026-08-17T21:42:00.000Z"), 30)).toBe(0);
  });

  it("brings people into the laboratory during weekday morning hours", () => {
    expect(scheduledOccupancy(new Date("2026-08-17T06:10:00.000Z"), 30)).toBeGreaterThan(0);
  });

  it("prefers a fresh physical occupancy reading over the schedule", () => {
    const now = new Date("2026-08-17T21:42:00.000Z");
    expect(resolveOccupancy({ now, sensors: [{ id: 9, sensorType: "occupancy" }], readings: { 9: { value: 2, recordedAt: "2026-08-17T21:40:00.000Z" } } })).toEqual({ value: 2, simulated: false });
  });
});
