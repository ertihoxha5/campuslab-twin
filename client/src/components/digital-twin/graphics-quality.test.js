import { describe, expect, it } from "vitest";
import { resolveGraphicsQuality } from "./graphics-quality.js";

describe("resolveGraphicsQuality", () => {
  it("honors an explicit preference", () => {
    expect(resolveGraphicsQuality("high", { hardwareConcurrency: 2 })).toBe(
      "high",
    );
    expect(resolveGraphicsQuality("low", { hardwareConcurrency: 16 })).toBe(
      "low",
    );
  });

  it("degrades auto quality on constrained devices", () => {
    expect(resolveGraphicsQuality("auto", { hardwareConcurrency: 4 })).toBe(
      "low",
    );
    expect(
      resolveGraphicsQuality("auto", {
        hardwareConcurrency: 12,
        deviceMemory: 16,
      }),
    ).toBe("high");
  });

  it("uses low quality when reduced motion is requested", () => {
    expect(
      resolveGraphicsQuality("auto", {
        hardwareConcurrency: 12,
        deviceMemory: 16,
        reducedMotion: true,
      }),
    ).toBe("low");
  });
});
