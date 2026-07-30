import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { EquipmentPage } from "./EquipmentPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const equipment = {
  id: "21",
  laboratoryId: "15",
  laboratoryName: "Laboratori i Automatizimit",
  name: "Robot industrial",
  code: "ROB-01",
  type: "Robotikë",
  manufacturer: "Prodhuesi",
  model: "R-1",
  status: "active",
  healthScore: 96,
  energyRatingWatts: 2500,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    fullName: "Arta Berisha",
    permissions: ["laboratories.view", "assets.manage"],
    university: { id: "7", name: "Universiteti Testues" },
  });
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("EquipmentPage", () => {
  it("renders tenant equipment and sends search filters", async () => {
    api.get.mockResolvedValue({
      data: { equipment: [equipment] },
      meta: { pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderPage();

    expect(await screen.findByText("Robot industrial")).toBeInTheDocument();
    expect(screen.getByText("96%")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.replace(/\s/g, "") === "2500W"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hap detajet" })).toHaveAttribute(
      "href",
      "/aplikacioni/pajisjet/21",
    );

    fireEvent.change(screen.getByLabelText("Kërko pajisjet"), {
      target: { value: "Robot" },
    });
    fireEvent.submit(screen.getByLabelText("Kërko pajisjet").form);

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/equipment?page=1&pageSize=12&search=Robot",
      ),
    );
  });

  it("validates and creates equipment with real tenant options", async () => {
    api.get.mockImplementation((path) => {
      if (path.startsWith("/api/equipment/options")) {
        return Promise.resolve({
          data: {
            laboratories: [
              {
                id: "15",
                name: "Laboratori i Automatizimit",
                code: "AUTO-01",
              },
            ],
            zones: path.includes("laboratoryId=15")
              ? [{ id: "3", name: "Zona e Robotikës", code: "ROB" }]
              : [],
            users: [{ id: "9", fullName: "Arta Berisha" }],
          },
        });
      }
      return Promise.resolve({
        data: { equipment: [] },
        meta: { pagination: { page: 1, pages: 0, total: 0 } },
      });
    });
    api.post.mockResolvedValue({
      data: { equipment, message: "Pajisja u krijua me sukses." },
    });

    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "Pajisje e re" }),
    );
    await screen.findByRole("option", {
      name: "Laboratori i Automatizimit (AUTO-01)",
    });
    fireEvent.change(screen.getByLabelText("Laboratori"), {
      target: { value: "15" },
    });
    await screen.findByRole("option", {
      name: "Zona e Robotikës (ROB)",
    });
    fireEvent.change(screen.getByLabelText("Zona"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Emri"), {
      target: { value: "Robot industrial" },
    });
    fireEvent.change(screen.getByLabelText("Kodi"), {
      target: { value: "ROB-01" },
    });
    fireEvent.change(screen.getByLabelText("Lloji"), {
      target: { value: "Robotikë" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Krijo pajisjen" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/equipment",
        expect.objectContaining({
          laboratoryId: "15",
          zoneId: "3",
          name: "Robot industrial",
          code: "ROB-01",
          type: "Robotikë",
          status: "active",
          healthScore: 100,
        }),
      ),
    );
    expect(
      await screen.findByText("Pajisja u krijua me sukses."),
    ).toBeInTheDocument();
  });

  it("keeps asset creation hidden from read-only users", async () => {
    useAuthStore.getState().setSession({
      fullName: "Blerim Hoxha",
      permissions: ["laboratories.view"],
      university: { id: "7", name: "Universiteti Testues" },
    });
    api.get.mockResolvedValue({
      data: { equipment: [] },
      meta: { pagination: { page: 1, pages: 0, total: 0 } },
    });

    renderPage();

    expect(
      await screen.findByText(
        "Nuk ka pajisje në laboratorët që ju janë caktuar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pajisje e re" }),
    ).not.toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <EquipmentPage />
    </MemoryRouter>,
  );
}
