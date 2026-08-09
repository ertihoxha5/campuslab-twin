import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { AnalyticsPage } from "./AnalyticsPage.jsx";

vi.mock("@/api/client.js", () => ({ api: { get: vi.fn() } }));

const analytics = {
  summary: { value: 22.5, minimum: 20, maximum: 25, samples: 4 },
  series: [
    {
      bucketStart: "2026-08-08",
      value: 22.5,
      minimum: 20,
      maximum: 25,
      samples: 4,
    },
  ],
  provenance: [{ source: "simulated", samples: 4 }],
  recommendationMethod: {
    type: "rule_based",
    version: "1.0",
    description:
      "Rekomandimet krijohen nga rregulla dhe pragje të dokumentuara.",
  },
  recommendations: [
    {
      ruleId: "temperature.high",
      title: "Temperaturë e lartë",
      severity: "high",
      explanation: "Vlera e matur 30 °C është mbi pragun 28 °C.",
      evidence: {
        observed: 30,
        operator: ">",
        threshold: 28,
        unit: "°C",
        samples: 4,
      },
      action: "Kontrolloni ventilimin dhe burimet e nxehtësisë.",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url.startsWith("/api/laboratories?"))
      return { data: { laboratories: [{ id: "15", name: "Laboratori A" }] } };
    if (url.startsWith("/api/analytics/history?"))
      return { data: { analytics } };
    if (url.startsWith("/api/sensors?"))
      return {
        data: {
          sensors: [{ id: "31", name: "Sensori A", sensorType: "temperature" }],
        },
      };
    if (url.startsWith("/api/equipment?"))
      return { data: { equipment: [{ id: "21", name: "Pajisja A" }] } };
    throw new Error(`Unexpected GET ${url}`);
  });
});

describe("AnalyticsPage", () => {
  it("renders stored historical summary, series, and provenance", async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByText("22,5 °C")).toBeInTheDocument();
    expect(screen.getByText("4 mostra")).toBeInTheDocument();
    expect(screen.getByText("Simuluar")).toBeInTheDocument();
    expect(screen.getByText("Temperaturë e lartë")).toBeInTheDocument();
    expect(screen.getByText("Rregulli · temperature.high")).toBeInTheDocument();
    expect(screen.getByText("30 °C > 28 °C")).toBeInTheDocument();
    expect(
      screen.getByText("Kontrolloni ventilimin dhe burimet e nxehtësisë."),
    ).toBeInTheDocument();
    expect(screen.getByText("Rule-based · versioni 1.0")).toBeInTheDocument();
    const request = api.get.mock.calls.find(([url]) =>
      url.startsWith("/api/analytics/history?"),
    )[0];
    expect(request).toContain("metric=temperature");
    expect(request).toContain("interval=daily");
    expect(request).toContain("startAt=");
    expect(request).toContain("endAt=");
  });

  it("loads real assets and sends laboratory and asset filters", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("22,5 °C");
    fireEvent.change(screen.getByLabelText("Laboratori"), {
      target: { value: "15" },
    });
    await screen.findByRole("option", { name: "Sensori A" });
    fireEvent.change(screen.getByLabelText("Asset-i"), {
      target: { value: "31" },
    });
    await waitFor(() => {
      const requests = api.get.mock.calls
        .map(([url]) => url)
        .filter((url) => url.startsWith("/api/analytics/history?"));
      expect(
        requests.some(
          (url) =>
            url.includes("laboratoryId=15") && url.includes("assetId=31"),
        ),
      ).toBe(true);
    });
    expect(api.get).toHaveBeenCalledWith(
      "/api/sensors?laboratoryId=15&page=1&pageSize=100&sort=name&direction=asc",
    );
    expect(api.get).toHaveBeenCalledWith(
      "/api/equipment?laboratoryId=15&page=1&pageSize=100&sort=name&direction=asc",
    );
  });
});
