import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { PlatformSummaryPage } from "./PlatformSummaryPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformSummaryPage", () => {
  it("renders only aggregated platform statistics", async () => {
    api.get.mockResolvedValue({
      data: {
        summary: {
          pendingRegistrations: 3,
          approvedRegistrations: 5,
          rejectedRegistrations: 1,
          activeUniversities: 4,
          suspendedUniversities: 1,
          publicUniversities: 2,
          privateUniversities: 3,
          activeUsers: 18,
          laboratories: 9,
        },
      },
    });

    render(<PlatformSummaryPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Përmbledhja e platformës",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("18")).toBeInTheDocument();
    expect(screen.getByText("Përdorues aktivë")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/platform/statistics/summary");
  });

  it("shows a safe error when aggregates cannot be loaded", async () => {
    api.get.mockRejectedValue({
      message: "Statistikat nuk mund të ngarkohen.",
    });
    render(<PlatformSummaryPage />);

    expect(
      await screen.findByText("Statistikat nuk mund të ngarkohen."),
    ).toBeInTheDocument();
  });
});
