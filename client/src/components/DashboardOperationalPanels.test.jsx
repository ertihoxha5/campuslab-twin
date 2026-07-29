import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardOperationalPanels } from "./DashboardOperationalPanels.jsx";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Area: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => null,
}));

const summary = {
  energyTrend: [
    {
      recordedAt: "2026-07-29 15:00:00",
      averagePowerWatts: 1250,
      energyKwh: 1.25,
    },
  ],
  equipmentStatus: [{ status: "active", total: 4 }],
  recentAlerts: [
    {
      id: "1",
      title: "Temperaturë e lartë",
      severity: "warning",
      laboratoryName: "Laboratori A",
      createdAt: "2026-07-29T15:00:00.000Z",
    },
  ],
  latestSensorReadings: [
    {
      id: "2",
      sensorName: "Temperatura A",
      laboratoryName: "Laboratori A",
      value: 24.5,
      unit: "°C",
      source: "simulated",
    },
  ],
  laboratoryHealth: [
    {
      id: "3",
      name: "Laboratori A",
      code: "LAB-A",
      equipmentHealth: 91,
      onlineSensors: 3,
      totalSensors: 4,
      activeAlerts: 1,
    },
  ],
  upcomingMaintenance: [
    {
      id: "4",
      title: "Kontrolli i pajisjes",
      status: "planned",
      laboratoryName: "Laboratori A",
      equipmentName: "Serveri A",
      dueAt: "2026-08-01T08:00:00.000Z",
    },
  ],
  recentActivities: [
    {
      id: "5",
      description: "Përdoruesi u kyç me sukses.",
      userName: "Arta Berisha",
      createdAt: "2026-07-29T15:00:00.000Z",
    },
  ],
  laboratories: [
    {
      id: "3",
      name: "Laboratori A",
      code: "LAB-A",
      capacity: 30,
    },
  ],
};

describe("DashboardOperationalPanels", () => {
  it("renders all real operational collections", () => {
    render(
      <MemoryRouter>
        <DashboardOperationalPanels summary={summary} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Temperaturë e lartë")).toBeInTheDocument();
    expect(screen.getByText("24,5 °C")).toBeInTheDocument();
    expect(screen.getByText("Simulim")).toBeInTheDocument();
    expect(screen.getByText("Kontrolli i pajisjes")).toBeInTheDocument();
    expect(screen.getByText("Përdoruesi u kyç me sukses.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Laboratori A/ })).toHaveAttribute(
      "href",
      "/aplikacioni/laboratoret?laboratory=3",
    );
  });

  it("renders Albanian empty states without invented data", () => {
    render(
      <MemoryRouter>
        <DashboardOperationalPanels summary={{}} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Nuk ka lexime energjie për këtë periudhë."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nuk ka pajisje të regjistruara."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nuk ka alarme të regjistruara."),
    ).toBeInTheDocument();
  });
});
