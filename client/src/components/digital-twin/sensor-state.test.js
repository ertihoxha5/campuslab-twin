import { describe, expect, it } from "vitest";
import { sensorVisualState } from "./sensor-state.js";

describe("sensorVisualState", () => {
  const sensor = {
    status: "online",
    warningMax: 28,
    criticalMax: 35,
  };

  it("maps live values to normal, warning and critical states", () => {
    expect(sensorVisualState(sensor, { value: 24 })).toBe("normal");
    expect(sensorVisualState(sensor, { value: 29 })).toBe("warning");
    expect(sensorVisualState(sensor, { value: 36 })).toBe("critical");
  });

  it("keeps offline state authoritative", () => {
    expect(sensorVisualState({ ...sensor, status: "offline" }, { value: 36 })).toBe(
      "offline",
    );
  });
});
