import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigitalTwinCanvas } from "./DigitalTwinCanvas.jsx";
import { supportsWebGL } from "./webgl.js";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="canvas" />,
}));
vi.mock("@react-three/drei", () => ({
  Bounds: ({ children }) => <div>{children}</div>,
  Grid: () => null,
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  useProgress: () => ({ active: false, progress: 0, item: "" }),
}));

describe("DigitalTwinCanvas", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
    vi.stubGlobal("WebGL2RenderingContext", class WebGL2RenderingContext {});
  });

  it("renders a reusable scene when WebGL 2 is available", () => {
    render(<DigitalTwinCanvas />);
    expect(screen.getByLabelText("Pamja 3D e laboratorit")).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
  });

  it("shows Albanian guidance when WebGL 2 is unavailable", () => {
    vi.stubGlobal("WebGL2RenderingContext", undefined);
    expect(supportsWebGL()).toBe(false);
    render(<DigitalTwinCanvas />);
    expect(screen.getByText("Pamja 3D nuk mund të hapet")).toBeInTheDocument();
  });
});
