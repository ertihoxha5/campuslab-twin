import { beforeEach, describe, expect, it, vi } from "vitest";

describe("WebGL capability check", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("WebGL2RenderingContext", class WebGL2RenderingContext {});
  });

  it("creates and releases only one probe context across repeated renders", async () => {
    const loseContext=vi.fn();
    const context={getExtension:vi.fn(()=>({loseContext}))};
    const getContext=vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(context);
    const {supportsWebGL}=await import("./webgl.js");

    expect(supportsWebGL()).toBe(true);
    expect(supportsWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
});
