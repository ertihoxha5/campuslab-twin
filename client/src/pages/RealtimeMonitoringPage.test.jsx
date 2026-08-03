import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { connectMonitoringRealtime } from "@/api/realtime.js";
import { RealtimeMonitoringPage } from "./RealtimeMonitoringPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));
vi.mock("@/api/realtime.js", () => ({
  connectMonitoringRealtime: vi.fn(() => vi.fn()),
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe("RealtimeMonitoringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => {
      if (path.startsWith("/api/laboratories")) {
        return Promise.resolve({
          data: {
            laboratories: [
              { id: "15", name: "Laboratori i Automatizimit", code: "AUT-01" },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          alerts: [
            {
              id: "71",
              title: "Prag kritik: Temperatura",
              description: "Temperatura kaloi pragun.",
              severity: "critical",
              status: "new",
            },
          ],
        },
      });
    });
  });

  it("loads real laboratories and active alerts without invented readings", async () => {
    render(<RealtimeMonitoringPage />);

    expect(await screen.findByText(/Laboratori i Automatizimit/)).toBeInTheDocument();
    expect(await screen.findByText("Prag kritik: Temperatura")).toBeInTheDocument();
    expect(screen.getByText("Në pritje të leximeve realtime nga simulatori.")).toBeInTheDocument();
    expect(connectMonitoringRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ laboratoryId: "15" }),
    );
  });

  it("renders sensor and energy cards from realtime events", async () => {
    render(<RealtimeMonitoringPage />);
    await waitFor(() => expect(connectMonitoringRealtime).toHaveBeenCalled());
    const { onEvent, onConnectionChange } = connectMonitoringRealtime.mock.calls.at(-1)[0];

    act(() => {
      onConnectionChange("connected");
      onEvent("sensor:reading", {
        laboratoryId: "15",
        sensorId: "4",
        sensorType: "temperature",
        value: 22.5,
        unit: "°C",
        source: "simulated",
        recordedAt: "2026-08-03T10:00:00.000Z",
      });
      onEvent("energy:reading", {
        laboratoryId: "15",
        equipmentId: "21",
        powerWatts: 1200,
        energyKwh: 0.02,
        recordedAt: "2026-08-03T10:00:00.000Z",
      });
    });

    expect(screen.getByText("Lidhur drejtpërdrejt")).toBeInTheDocument();
    expect(screen.getByText(/22,5 °C/)).toBeInTheDocument();
    expect(screen.getByText(/1[.,]?200 W/)).toBeInTheDocument();
    expect(screen.getByText(/Simuluar ·/)).toBeInTheDocument();
  });
});
