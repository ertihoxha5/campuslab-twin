import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigitalTwinCanvas } from "./DigitalTwinCanvas.jsx";

vi.mock("@react-three/fiber", () => ({ Canvas: ({ frameloop }) => <div data-testid="r3f-canvas" data-frameloop={frameloop} /> }));
vi.mock("@react-three/drei", () => ({ ContactShadows: () => null, Html: ({ children }) => <div>{children}</div>, PerspectiveCamera: () => null }));
vi.mock("./LaboratoryArchitecture.jsx", () => ({ LaboratoryArchitecture: () => null }));
vi.mock("./LaboratoryAssets.jsx", () => ({ LaboratoryAssets: () => null }));
vi.mock("./IoTDevices.jsx", () => ({ IoTDevices: () => null }));
vi.mock("./SecurityCameras.jsx", () => ({ SecurityCameras: () => null }));
vi.mock("./TwinDataFlows.jsx", () => ({ TwinDataFlows: () => null }));
vi.mock("./TwinCameraController.jsx", () => ({ TwinCameraController: () => null }));

const props = { assets: [], sensors: [], selection: null, onSelect: vi.fn(), layers: { zones: false, equipment: true, sensors: true, dataFlow: false }, cameraMode: "overview", resetNonce: 0 };
describe("DigitalTwinCanvas rebuilt foundation", () => {
  beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({}); vi.stubGlobal("WebGL2RenderingContext", class WebGL2RenderingContext {}); });
  it("renders continuously for live scene updates", () => { render(<DigitalTwinCanvas {...props}/>); expect(screen.getByLabelText("Laboratori operacional 3D")).toBeInTheDocument(); expect(screen.getByTestId("r3f-canvas")).toHaveAttribute("data-frameloop", "always"); });
  it("shows a clear state without WebGL", () => { vi.stubGlobal("WebGL2RenderingContext", undefined); render(<DigitalTwinCanvas {...props}/>); expect(screen.getByText("Pamja 3D nuk mund të hapet")).toBeInTheDocument(); });
});
