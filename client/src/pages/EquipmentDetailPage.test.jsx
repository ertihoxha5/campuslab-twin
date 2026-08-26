import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { EquipmentDetailPage } from "./EquipmentDetailPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const equipment = {
  id: "21",
  laboratoryId: "15",
  laboratoryName: "Laboratori i Automatizimit",
  zoneId: "3",
  zoneName: "Zona e Robotikës",
  responsibleUserId: "9",
  responsibleUserName: "Arta Berisha",
  name: "Robot industrial",
  code: "ROB-01",
  type: "Robotikë",
  manufacturer: "ABB",
  model: "IRB 120",
  serialNumber: "SN-120",
  status: "active",
  purchaseDate: "2025-02-10",
  warrantyExpiresAt: "2028-02-10",
  healthScore: 96,
  energyRatingWatts: 2500,
  object3dReference: "robot-industrial.glb",
};

const options = {
  laboratories: [
    { id: "15", name: "Laboratori i Automatizimit", code: "AUTO-01" },
  ],
  zones: [{ id: "3", name: "Zona e Robotikës", code: "ROB" }],
  users: [{ id: "9", fullName: "Arta Berisha" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    fullName: "Arta Berisha",
    permissions: ["laboratories.view", "assets.manage"],
    university: { id: "7", name: "Universiteti Testues" },
  });
  api.get.mockImplementation((path) =>
    Promise.resolve(
      path.startsWith("/api/equipment/options")
        ? { data: options }
        : { data: { equipment } },
    ),
  );
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("EquipmentDetailPage", () => {
  it("shows all persisted equipment details", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Robot industrial" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Laboratori i Automatizimit")).toBeInTheDocument();
    expect(screen.getByText("Zona e Robotikës")).toBeInTheDocument();
    expect(screen.getByText("robot-industrial.glb")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/equipment/21");
  });

  it("updates equipment through the shared validated form", async () => {
    api.put.mockResolvedValue({
      data: {
        equipment: { ...equipment, healthScore: 88 },
        message: "Pajisja u përditësua me sukses.",
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Ndrysho" }));
    await screen.findByRole("option", {
      name: "Laboratori i Automatizimit (AUTO-01)",
    });
    fireEvent.change(screen.getByLabelText("Shëndeti (%)"), {
      target: { value: "88" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ruaj ndryshimet" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/equipment/21",
        expect.objectContaining({
          laboratoryId: "15",
          name: "Robot industrial",
          healthScore: 88,
        }),
      ),
    );
    expect(
      await screen.findByText("Pajisja u përditësua me sukses."),
    ).toBeInTheDocument();
  });

  it("archives only after confirmation and returns to the list", async () => {
    api.delete.mockResolvedValue({
      data: { message: "Pajisja u arkivua me sukses." },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Arkivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkivo pajisjen" }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/api/equipment/21"),
    );
    expect(
      await screen.findByRole("heading", { name: "Lista e pajisjeve" }),
    ).toBeInTheDocument();
  });

  it("keeps management actions hidden from read-only users", async () => {
    useAuthStore.getState().setSession({
      fullName: "Blerim Hoxha",
      permissions: ["laboratories.view"],
      university: { id: "7", name: "Universiteti Testues" },
    });
    renderPage();

    await screen.findByRole("heading", { name: "Robot industrial" });
    expect(
      screen.queryByRole("button", { name: "Ndrysho" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arkivo" }),
    ).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith("/api/equipment/21/visual-assets");
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/aplikacioni/pajisjet/21"]}>
      <Routes>
        <Route
          path="/aplikacioni/pajisjet/:equipmentId"
          element={<EquipmentDetailPage />}
        />
        <Route
          path="/aplikacioni/pajisjet"
          element={<h1>Lista e pajisjeve</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
