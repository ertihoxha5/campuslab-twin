import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { DigitalTwinPage } from "./DigitalTwinPage.jsx";

const { canvasSpy } = vi.hoisted(() => ({ canvasSpy: vi.fn() }));

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));
vi.mock("@/components/digital-twin/DigitalTwinCanvas.jsx", () => ({
  DigitalTwinCanvas: (props) => {
    canvasSpy(props);
    return <div data-testid="digital-twin-canvas" />;
  },
}));

describe("DigitalTwinPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the first authorized active laboratory", async () => {
    api.get.mockImplementation((path) => {
      if (path === "/api/laboratories/15") {
        return Promise.resolve({
          data: {
            laboratory: {
              id: "15",
              modelFileId: "31",
              modelOriginalName: "automatizimi.glb",
              modelMimeType: "model/gltf-binary",
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          laboratories: [
            { id: "15", name: "Laboratori i Automatizimit", code: "AUT-01" },
          ],
        },
      });
    });

    render(<DigitalTwinPage />);

    expect(
      await screen.findByRole("option", {
        name: "Laboratori i Automatizimit (AUT-01)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("digital-twin-canvas")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/api/laboratories?page=1&pageSize=100&status=active",
    );
    expect(await screen.findByText("Po ngarkohet modeli 3D…")).toBeInTheDocument();
    expect(canvasSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelUrl: "/api/laboratories/15/model?v=31",
      }),
    );
  });

  it("shows an honest empty state when no laboratory is available", async () => {
    api.get.mockResolvedValue({ data: { laboratories: [] } });
    render(<DigitalTwinPage />);
    expect(
      await screen.findByText("Nuk ka laborator për t’u paraqitur"),
    ).toBeInTheDocument();
  });

  it("switches between deterministic camera presets", async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((path) =>
      Promise.resolve(
        path === "/api/laboratories/15"
          ? { data: { laboratory: { id: "15" } } }
          : {
              data: {
                laboratories: [
                  { id: "15", name: "Laboratori Test", code: "TEST-01" },
                ],
              },
            },
      ),
    );
    render(<DigitalTwinPage />);
    await screen.findByRole("option", { name: "Laboratori Test (TEST-01)" });

    await user.click(screen.getByRole("button", { name: /Nga lart/ }));

    expect(canvasSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ cameraMode: "top" }),
    );
    expect(screen.getByRole("button", { name: /Nga lart/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("enters first-person mode and resets the viewer position", async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((path) =>
      Promise.resolve(
        path === "/api/laboratories/15"
          ? { data: { laboratory: { id: "15" } } }
          : {
              data: {
                laboratories: [
                  { id: "15", name: "Laboratori Test", code: "TEST-01" },
                ],
              },
            },
      ),
    );
    render(<DigitalTwinPage />);
    await screen.findByRole("option", { name: "Laboratori Test (TEST-01)" });

    await user.click(screen.getByRole("button", { name: /Ecje/ }));
    expect(canvasSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ cameraMode: "firstPerson", firstPersonReset: 0 }),
    );
    await user.click(
      screen.getByRole("button", { name: "Rikthe pozicionin first-person" }),
    );
    expect(canvasSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ cameraMode: "firstPerson", firstPersonReset: 1 }),
    );
  });
});
