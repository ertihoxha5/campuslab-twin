import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { UniversityOverviewPage } from "./UniversityOverviewPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));

const user = {
  fullName: "Arta Berisha",
  university: { id: "2", name: "Universiteti Testues", acronym: "UT" },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession(user);
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("UniversityOverviewPage", () => {
  it("renders real tenant KPI values and simulation provenance", async () => {
    api.get.mockResolvedValue({
      data: {
        summary: {
          metrics: {
            laboratories: 3,
            activeEquipment: 12,
            faultEquipment: 2,
            onlineSensors: 18,
            activeAlerts: 4,
            currentPowerWatts: 2450,
            currentOccupancy: 27,
            plannedMaintenance: 5,
            infrastructureHealth: 86,
          },
          lastUpdatedAt: "2026-07-29T16:00:00.000Z",
          containsSimulatedData: true,
        },
      },
    });

    render(<UniversityOverviewPage />);

    expect(await screen.findByText("Numri i laboratorëve")).toBeInTheDocument();
    expect(screen.getByText("2,45 kW")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(
      screen.getByText("Përmban të dhëna të simuluara"),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/dashboard/summary");
  });

  it("shows onboarding when the university has no laboratories", async () => {
    api.get.mockResolvedValue({
      data: {
        summary: {
          metrics: { laboratories: 0 },
          lastUpdatedAt: "2026-07-29T16:00:00.000Z",
          containsSimulatedData: false,
        },
      },
    });
    render(<UniversityOverviewPage />);
    expect(
      await screen.findByText("Nuk ka ende laboratorë aktivë"),
    ).toBeInTheDocument();
  });

  it("shows a retryable Albanian error", async () => {
    api.get.mockRejectedValue({
      message: "Përmbledhja nuk mund të merret nga serveri.",
    });
    render(<UniversityOverviewPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Përmbledhja nuk mund të merret nga serveri.",
    );
    expect(
      screen.getByRole("button", { name: "Provo përsëri" }),
    ).toBeInTheDocument();
  });
});
