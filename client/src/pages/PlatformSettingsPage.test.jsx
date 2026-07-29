import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { PlatformSettingsPage } from "./PlatformSettingsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({
    data: {
      settings: {
        registrationsOpen: true,
        requireWebsiteDomainMatch: true,
        allowPublicEmailProviders: false,
      },
      exceptions: [],
    },
  });
});

describe("PlatformSettingsPage", () => {
  it("loads and saves registration rules", async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValue({
      data: {
        settings: {
          registrationsOpen: false,
          requireWebsiteDomainMatch: true,
          allowPublicEmailProviders: false,
        },
      },
    });
    render(<PlatformSettingsPage />);

    const registrations = await screen.findByLabelText(
      /Prano regjistrime të reja/,
    );
    await user.click(registrations);
    await user.click(screen.getByRole("button", { name: "Ruaj rregullat" }));

    expect(api.put).toHaveBeenCalledWith("/api/platform/settings", {
      registrationsOpen: false,
      requireWebsiteDomainMatch: true,
      allowPublicEmailProviders: false,
    });
    expect(await screen.findByText("Rregullat u ruajtën.")).toBeInTheDocument();
  });

  it("shows the empty exceptions state", async () => {
    render(<PlatformSettingsPage />);
    expect(
      await screen.findByText("Nuk ka përjashtime aktive."),
    ).toBeInTheDocument();
  });
});
