import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { AlertsPage } from "./AlertsPage.jsx";

vi.mock("@/api/client.js", () => ({ api: { get: vi.fn() } }));

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => {
      if (path.startsWith("/api/laboratories?")) return Promise.resolve({ data: { laboratories: [
        { id: "5", name: "Laboratori i Automatizimit", code: "LAB-AUT-01" },
      ] } });
      if (path.startsWith("/api/alerts/executed-scenarios?")) return Promise.resolve({ data: { scenarios: [
        { id: "13", laboratoryCode: "LAB-AUT-01", scenario: "high_power", startedAt: "2026-10-11T13:20:14.093Z",
          readings: [{ sensorType: "power", value: 7000, unit: "W" }],
          alert: { id: "7", severityAtExecution: "critical", currentSeverity: "warning" } },
      ] } });
      if (path.startsWith("/api/alerts?")) return Promise.resolve({ data: { alerts: [
        { id: "4", title: "Paralajmërim: Temperatura", description: "Temperatura regjistroi 29 °C.",
          severity: "warning", status: "new", laboratoryName: "Laboratori i Automatizimit" },
      ] }, meta: { pagination: { total: 1, pages: 1 } } });
      if (path === "/api/alerts/4") return Promise.resolve({ data: { alert: {
        id: "4", title: "Paralajmërim: Temperatura", description: "Temperatura regjistroi 29 °C.",
        severity: "warning", status: "new", laboratoryName: "Laboratori i Automatizimit",
        sensorName: "Sensori testues", source: "simulated", history: [],
      } } });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it("shows real alerts and their detail from the API", async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);
    expect(await screen.findByRole("heading", { name: "Fuqia e lartë" })).toBeInTheDocument();
    expect(screen.getByText(/niveli aktual:/)).toHaveTextContent("Paralajmërim");
    expect(await screen.findByRole("button", { name: /#4 · Paralajmërim: Temperatura/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /#4 · Paralajmërim: Temperatura/ }));
    expect(await screen.findByRole("heading", { name: "Alarmi #4" })).toBeInTheDocument();
    expect(screen.getAllByText("Temperatura regjistroi 29 °C.")).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Laboratori"), "5");
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("laboratoryId=5"));
  });
});
