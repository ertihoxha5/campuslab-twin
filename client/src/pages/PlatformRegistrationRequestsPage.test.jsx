import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { PlatformRegistrationRequestsPage } from "./PlatformRegistrationRequestsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

const summary = {
  id: "7",
  universityName: "Universiteti Testues",
  acronym: "UT",
  representativeName: "Arta Test",
  representativeEmail: "arta@universiteti.test",
  status: "pending",
};

const detail = {
  ...summary,
  institutionType: "private",
  city: "Prishtinë",
  address: "Rruga Test",
  officialWebsite: "https://universiteti.test",
  representativePhone: "+38344000000",
  description: "Universitet për testim.",
  createdAt: "2026-07-29T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformRegistrationRequestsPage", () => {
  it("shows the real pending registration list and its details", async () => {
    api.get
      .mockResolvedValueOnce({
        data: { registrationRequests: [summary] },
      })
      .mockResolvedValueOnce({
        data: { registrationRequest: detail },
      });

    render(<PlatformRegistrationRequestsPage />);

    expect(await screen.findByText("Universiteti Testues")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Universiteti Testues/ }),
    );

    expect(await screen.findByText("Universitet privat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aprovo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refuzo/ })).toBeInTheDocument();
  });

  it("approves a selected request through the platform API", async () => {
    api.get
      .mockResolvedValueOnce({
        data: { registrationRequests: [summary] },
      })
      .mockResolvedValueOnce({
        data: { registrationRequest: detail },
      })
      .mockResolvedValueOnce({
        data: { registrationRequests: [] },
      });
    api.patch.mockResolvedValue({
      data: { message: "Kërkesa u aprovua dhe universiteti u aktivizua." },
    });

    render(<PlatformRegistrationRequestsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Universiteti Testues/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Aprovo/ }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/api/platform/registration-requests/7/decision",
        { decision: "approved", reason: "" },
      ),
    );
    expect(
      await screen.findByText(
        "Kërkesa u aprovua dhe universiteti u aktivizua.",
      ),
    ).toBeInTheDocument();
  });
});
