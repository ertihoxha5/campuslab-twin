import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { UniversitySettingsPage } from "./UniversitySettingsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const profile = {
  id: "7",
  name: "Universiteti Test",
  acronym: "UT",
  institutionType: "public",
  city: "Prishtinë",
  address: "Rruga Test 1",
  officialWebsite: "https://universiteti.test",
  description: "Përshkrimi",
  representativeName: "Ada Test",
  representativeEmail: "ada@universiteti.test",
  logoFileId: null,
};
const refreshedUser = {
  id: "9",
  permissions: ["university.profile.manage"],
  university: {
    id: "7",
    name: "Universiteti i Ri",
    acronym: "UIR",
    logoFileId: "22",
  },
};
const preferences = {
  temperatureMinC: 18,
  temperatureMaxC: 28,
  humidityMinPercent: 30,
  humidityMaxPercent: 70,
  co2MaxPpm: 1000,
  smokeMaxPercent: 1,
  maintenanceReminderDays: 3,
  notifyAlerts: true,
  notifyMaintenance: true,
  notifyEnergy: true,
  notifySimulations: true,
  simulationDurationMinutes: 15,
  simulationTickSeconds: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore
    .getState()
    .setSession({ ...refreshedUser, university: { ...profile } });
  api.get.mockImplementation(async (url) => {
    if (url === "/api/university/profile") return { data: { profile } };
    if (url === "/api/university/settings")
      return { data: { settings: preferences } };
    if (url === "/api/energy/settings")
      return {
        data: { settings: { tariffPerKwh: 0.12, currencyCode: "EUR" } },
      };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.put.mockImplementation(async (url, body) => {
    if (url === "/api/university/profile")
      return {
        data: {
          profile: { ...profile, name: "Universiteti i Ri", acronym: "UIR" },
          message: "Profili i universitetit u ruajt me sukses.",
        },
      };
    if (url === "/api/university/settings")
      return {
        data: {
          settings: { ...preferences, ...body },
          message: "Preferencat u ruajtën me sukses.",
        },
      };
    if (url === "/api/energy/settings")
      return {
        data: {
          settings: { ...body, tariffPerKwh: Number(body.tariffPerKwh) },
          message: "Tarifa u ruajt me sukses.",
        },
      };
    throw new Error(`Unexpected PUT ${url}`);
  });
  api.post.mockImplementation(async (url) => {
    if (url === "/api/auth/session") return { data: { user: refreshedUser } };
    if (url === "/api/university/profile/logo")
      return {
        data: {
          logo: { id: "22" },
          message: "Logoja e universitetit u ruajt me sukses.",
        },
      };
    throw new Error(`Unexpected POST ${url}`);
  });
});

describe("UniversitySettingsPage", () => {
  it("loads and saves the tenant profile then refreshes branding", async () => {
    render(<UniversitySettingsPage />);
    const name = await screen.findByLabelText("Emri zyrtar");
    expect(name).toHaveValue("Universiteti Test");
    fireEvent.change(name, { target: { value: "Universiteti i Ri" } });
    fireEvent.change(screen.getByLabelText("Akronimi"), {
      target: { value: "UIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ruaj profilin/i }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/university/profile",
        expect.objectContaining({ name: "Universiteti i Ri", acronym: "UIR" }),
      ),
    );
    expect(api.post).toHaveBeenCalledWith("/api/auth/session");
    expect(useAuthStore.getState().user.university.name).toBe(
      "Universiteti i Ri",
    );
  });

  it("uploads the selected logo as multipart and refreshes the session", async () => {
    render(<UniversitySettingsPage />);
    const input = await screen.findByLabelText("Zgjidh logon");
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      "logo.png",
      { type: "image/png" },
    );
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/university/profile/logo",
        expect.any(FormData),
      ),
    );
    const body = api.post.mock.calls.find(
      ([url]) => url === "/api/university/profile/logo",
    )[1];
    expect(body.get("logo")).toBe(file);
    expect(useAuthStore.getState().user.university.logoFileId).toBe("22");
    expect(
      await screen.findByText("Logoja e universitetit u ruajt me sukses."),
    ).toBeInTheDocument();
  });

  it("saves monitoring, notification and simulation preferences", async () => {
    render(<UniversitySettingsPage />);
    const co2 = await screen.findByLabelText("CO₂ maksimal (ppm)");
    fireEvent.change(co2, { target: { value: "1200" } });
    fireEvent.click(screen.getByLabelText("Raportet e energjisë"));
    fireEvent.click(screen.getByRole("button", { name: /Ruaj preferencat/i }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/university/settings",
        expect.objectContaining({ co2MaxPpm: "1200", notifyEnergy: false }),
      ),
    );
    expect(
      await screen.findByText("Preferencat u ruajtën me sukses."),
    ).toBeInTheDocument();
  });

  it("saves the centralized energy tariff", async () => {
    render(<UniversitySettingsPage />);
    const input = await screen.findByLabelText("Tarifa për kWh");
    fireEvent.change(input, { target: { value: "0.18" } });
    fireEvent.click(screen.getByRole("button", { name: /Ruaj tarifën/i }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/api/energy/settings", {
        tariffPerKwh: "0.18",
        currencyCode: "EUR",
      }),
    );
  });
});
