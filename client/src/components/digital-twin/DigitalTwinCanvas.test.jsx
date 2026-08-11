import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigitalTwinCanvas } from "./DigitalTwinCanvas.jsx";
import { supportsWebGL } from "./webgl.js";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ frameloop, dpr, performance }) => (
    <div
      data-testid="canvas"
      data-frameloop={frameloop}
      data-dpr={JSON.stringify(dpr)}
      data-performance-min={performance?.min}
    />
  ),
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
    expect(screen.getByTestId("canvas")).toHaveAttribute(
      "data-frameloop",
      "demand",
    );
    expect(screen.getByTestId("canvas")).toHaveAttribute(
      "data-performance-min",
      "0.5",
    );
  });

  it("renders continuously only for first-person movement", () => {
    render(<DigitalTwinCanvas cameraMode="firstPerson" quality="low" />);
    expect(screen.getByTestId("canvas")).toHaveAttribute(
      "data-frameloop",
      "always",
    );
    expect(screen.getByTestId("canvas")).toHaveAttribute("data-dpr", "1");
  });

  it("shows Albanian guidance when WebGL 2 is unavailable", () => {
    vi.stubGlobal("WebGL2RenderingContext", undefined);
    expect(supportsWebGL()).toBe(false);
    render(<DigitalTwinCanvas />);
    expect(screen.getByText("Pamja 3D nuk mund të hapet")).toBeInTheDocument();
  });
});
