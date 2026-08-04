import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { DigitalTwinPage } from "./DigitalTwinPage.jsx";

const { canvasSpy, markerSpy, equipmentMarkerSpy } = vi.hoisted(() => ({
  canvasSpy: vi.fn(),
  markerSpy: vi.fn(),
  equipmentMarkerSpy: vi.fn(),
}));

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));
vi.mock("@/api/realtime.js", () => ({
  connectMonitoringRealtime: vi.fn(() => vi.fn()),
}));
vi.mock("@/components/digital-twin/SensorMarkers.jsx", () => ({
  SensorMarkers: (props) => {
    markerSpy(props);
    return null;
  },
}));
vi.mock("@/components/digital-twin/EquipmentMarkers.jsx", () => ({
  EquipmentMarkers: (props) => {
    equipmentMarkerSpy(props);
    return null;
  },
}));
vi.mock("@/components/digital-twin/DigitalTwinCanvas.jsx", () => ({
  DigitalTwinCanvas: (props) => {
    canvasSpy(props);
    return <div data-testid="digital-twin-canvas">{props.children}</div>;
  },
}));

describe("DigitalTwinPage", () => {
  beforeEach(() => vi.clearAllMocks());

  function mockLaboratoryApi({
    name = "Laboratori Test",
    code = "TEST-01",
    detail = { id: "15" },
    sensors = [],
    readings = [],
    equipment = [],
    zones = [],
    alerts = [],
  } = {}) {
    api.get.mockImplementation((path) => {
      if (path === "/api/laboratories/15") {
        return Promise.resolve({ data: { laboratory: detail } });
      }
      if (path.startsWith("/api/sensors?")) {
        return Promise.resolve({ data: { sensors } });
      }
      if (path.startsWith("/api/dashboard/summary")) {
        return Promise.resolve({
          data: { summary: { latestSensorReadings: readings } },
        });
      }
      if (path.startsWith("/api/equipment?")) {
        return Promise.resolve({ data: { equipment } });
      }
      if (path.endsWith("/zones")) {
        return Promise.resolve({ data: { zones } });
      }
      if (path.startsWith("/api/alerts?")) {
        return Promise.resolve({ data: { alerts } });
      }
      return Promise.resolve({
        data: { laboratories: [{ id: "15", name, code }] },
      });
    });
  }

  it("opens the first authorized active laboratory", async () => {
    mockLaboratoryApi({
      name: "Laboratori i Automatizimit",
      code: "AUT-01",
      detail: {
        id: "15",
        modelFileId: "31",
        modelOriginalName: "automatizimi.glb",
        modelMimeType: "model/gltf-binary",
      },
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

  it("loads tenant equipment and renders selectable 3D markers", async () => {
    mockLaboratoryApi({
      equipment: [
        {
          id: "21",
          name: "PLC Siemens",
          type: "controller",
          status: "active",
          healthScore: 97,
          zoneId: "8",
        },
      ],
      zones: [{ id: "8", positionX: 2, positionY: 0, positionZ: -1 }],
    });
    render(<DigitalTwinPage />);
    await screen.findByRole("option", { name: "Laboratori Test (TEST-01)" });

    await vi.waitFor(() =>
      expect(equipmentMarkerSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          equipment: [expect.objectContaining({ id: "21" })],
          visible: true,
        }),
      ),
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
    mockLaboratoryApi();
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
    mockLaboratoryApi();
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

  it("reveals stored sensor positions and applies live readings", async () => {
    const user = userEvent.setup();
    mockLaboratoryApi({
      sensors: [
        {
          id: "4",
          name: "Temperatura hyrëse",
          sensorType: "temperature",
          unit: "°C",
          status: "online",
          positionX: 2,
          positionY: 1.4,
          positionZ: -1,
        },
      ],
    });
    render(<DigitalTwinPage />);
    await screen.findByRole("option", { name: "Laboratori Test (TEST-01)" });
    await user.click(screen.getByRole("button", { name: "Zbulo sensorët" }));
    await vi.waitFor(() =>
      expect(markerSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ visible: true }),
      ),
    );

    const { onEvent } = connectMonitoringRealtime.mock.calls.at(-1)[0];
    act(() => {
      onEvent("sensor:reading", {
        sensorId: "4",
        value: 31.2,
        unit: "°C",
        recordedAt: "2026-08-04T08:00:00.000Z",
      });
    });

    await vi.waitFor(() =>
      expect(markerSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          readings: expect.objectContaining({
            4: expect.objectContaining({ value: 31.2 }),
          }),
        }),
      ),
    );
  });
});
