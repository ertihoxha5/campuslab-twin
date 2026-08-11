import { describe, expect, it } from "vitest";
import {
  localizedLabel,
  operationalStatusLabels,
  sensorTypeLabels,
  sourceLabels,
} from "./localization.js";

describe("Albanian localization labels", () => {
  it("localizes API enum values used by live and 3D views", () => {
    expect(localizedLabel(sensorTypeLabels, "temperature")).toBe("Temperaturë");
    expect(localizedLabel(operationalStatusLabels, "in_progress")).toBe(
      "Në trajtim",
    );
    expect(localizedLabel(sourceLabels, "simulated")).toBe("Simuluar");
  });

  it("does not expose an unknown backend enum in the interface", () => {
    expect(localizedLabel(operationalStatusLabels, "future_status")).toBe(
      "E panjohur",
    );
  });
});
