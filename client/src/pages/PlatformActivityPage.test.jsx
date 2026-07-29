import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { PlatformActivityPage } from "./PlatformActivityPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformActivityPage", () => {
  it("renders audited administrator actions", async () => {
    api.get.mockResolvedValue({
      data: {
        activities: [
          {
            id: "7",
            action: "university.suspended",
            description: "Universiteti u pezullua.",
            administratorName: "Admin Platforme",
            createdAt: "2026-07-29T14:00:00.000Z",
          },
        ],
      },
      meta: {
        pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
      },
    });

    render(<PlatformActivityPage />);

    expect(
      await screen.findByText("Universiteti u pezullua."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Admin Platforme/)).toBeInTheDocument();
    expect(screen.getAllByText("Universitetet")).toHaveLength(2);
  });

  it("shows a safe loading error", async () => {
    api.get.mockRejectedValue({
      message: "Historiku nuk mund të ngarkohet.",
    });
    render(<PlatformActivityPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Historiku nuk mund të ngarkohet.",
    );
  });
});
