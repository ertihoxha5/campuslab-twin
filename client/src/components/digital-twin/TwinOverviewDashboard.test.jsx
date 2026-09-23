import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TwinOverviewDashboard } from "./TwinOverviewDashboard.jsx";

describe("laboratory Digital Twin dashboard", () => {
  it("shows only the selected laboratory's zones and live device records", () => {
    const onSelect = vi.fn();
    render(<TwinOverviewDashboard
      laboratory={{ name: "Laboratori i Automatizimit", code: "LAB-A" }}
      zones={[{ id: "zone-1", code: "ROB-01", name: "Robotika", color: "#6e7a4f" }]}
      assets={[{ id: "asset-1", code: "ARM-01", name: "Krahu robotik", zoneId: "zone-1", zoneName: "Robotika", status: "operational", energyWatts: 640 }]}
      sensors={[{ id: "sensor-1", name: "Temperatura", zoneId: "zone-1", zoneName: "Robotika", type: "temperature", state: "normal", value: 22.4, unit: "°C" }]}
      events={[]}
      alerts={[]}
      onSelect={onSelect}
      onClose={vi.fn()}
    />);
    expect(screen.getByText("Laboratori i Automatizimit")).toBeTruthy();
    expect(screen.getByText("22.4°C")).toBeTruthy();
    fireEvent.click(screen.getByText("Pajisjet"));
    fireEvent.click(screen.getByText("Krahu robotik"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: "asset", item: expect.objectContaining({ id: "asset-1" }) }));
    fireEvent.click(screen.getByText("Sensorët"));
    expect(screen.getAllByText("Temperatura").length).toBeGreaterThan(1);
  });
});
