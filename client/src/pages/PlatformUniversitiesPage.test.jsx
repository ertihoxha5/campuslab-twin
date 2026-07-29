import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { PlatformUniversitiesPage } from "./PlatformUniversitiesPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

const university = {
  id: "7",
  name: "Universiteti Testues",
  acronym: "UT",
  city: "Prishtinë",
  representativeEmail: "admin@universiteti.test",
  userCount: 3,
  status: "active",
  suspensionReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformUniversitiesPage", () => {
  it("shows active universities and validates a suspension reason", async () => {
    api.get.mockResolvedValue({
      data: { universities: [university] },
    });

    render(<PlatformUniversitiesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Universiteti Testues/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Pezullo universitetin/ }),
    );

    expect(
      screen.getByText(
        "Shkruani arsyen e pezullimit me të paktën 3 karaktere.",
      ),
    ).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("suspends a university through the platform API", async () => {
    api.get
      .mockResolvedValueOnce({ data: { universities: [university] } })
      .mockResolvedValueOnce({ data: { universities: [] } });
    api.patch.mockResolvedValue({
      data: { message: "Universiteti u pezullua." },
    });

    render(<PlatformUniversitiesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Universiteti Testues/ }),
    );
    fireEvent.change(screen.getByLabelText("Arsyeja e pezullimit"), {
      target: { value: "Shkelje e rregullave" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Pezullo universitetin/ }),
    );

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/api/platform/universities/7/status",
        { status: "suspended", reason: "Shkelje e rregullave" },
      ),
    );
    expect(
      await screen.findByText("Universiteti u pezullua."),
    ).toBeInTheDocument();
  });
});
