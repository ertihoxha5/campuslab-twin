import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { connectDashboardRealtime } from "@/api/realtime.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { UniversityOverviewPage } from "./UniversityOverviewPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));

vi.mock("@/api/realtime.js", () => ({
  connectDashboardRealtime: vi.fn(() => vi.fn()),
}));

const user = {
  fullName: "Arta Berisha",
  university: { id: "2", name: "Universiteti Testues", acronym: "UT" },
};

function renderOverview() {
  return render(
    <MemoryRouter>
      <UniversityOverviewPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  connectDashboardRealtime.mockReturnValue(vi.fn());
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
          laboratories: [
            {
              id: "3",
              name: "Laboratori A",
              code: "LAB-A",
              capacity: 30,
            },
          ],
        },
      },
    });

    renderOverview();

    expect(await screen.findByText("Numri i laboratorëve")).toBeInTheDocument();
    expect(screen.getByText("2,45 kW")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(
      screen.getByText("Përmban të dhëna të simuluara"),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/dashboard/summary?hours=24");
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
    renderOverview();
    expect(
      await screen.findByText("Nuk ka ende laboratorë aktivë"),
    ).toBeInTheDocument();
  });

  it("shows a retryable Albanian error", async () => {
    api.get.mockRejectedValue({
      message: "Përmbledhja nuk mund të merret nga serveri.",
    });
    renderOverview();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Përmbledhja nuk mund të merret nga serveri.",
    );
    expect(
      screen.getByRole("button", { name: "Provo përsëri" }),
    ).toBeInTheDocument();
  });

  it("reloads the single endpoint with laboratory and time filters", async () => {
    const userInteraction = userEvent.setup();
    api.get.mockResolvedValue({
      data: {
        summary: {
          metrics: { laboratories: 1 },
          lastUpdatedAt: "2026-07-29T16:00:00.000Z",
          containsSimulatedData: false,
          laboratories: [
            {
              id: "3",
              name: "Laboratori A",
              code: "LAB-A",
              capacity: 30,
            },
          ],
        },
      },
    });
    renderOverview();

    await screen.findByText("Numri i laboratorëve");
    await userInteraction.selectOptions(
      screen.getByLabelText("Laboratori"),
      "3",
    );
    await userInteraction.selectOptions(
      screen.getByLabelText("Intervali i energjisë"),
      "168",
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/dashboard/summary?hours=168&laboratoryId=3",
      ),
    );
  });

  it("refreshes the summary when an operational realtime event arrives", async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValue({
      data: {
        summary: {
          metrics: { laboratories: 1 },
          lastUpdatedAt: "2026-07-29T16:00:00.000Z",
          containsSimulatedData: true,
          laboratories: [],
        },
      },
    });

    renderOverview();
    await vi.runAllTimersAsync();

    const realtimeOptions = connectDashboardRealtime.mock.calls[0][0];
    realtimeOptions.onOperationalChange();
    await vi.advanceTimersByTimeAsync(300);

    expect(api.get).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
