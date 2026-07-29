import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { LaboratoryDetailPage } from "./LaboratoryDetailPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const laboratory = {
  id: "15",
  name: "Laboratori i Automatizimit",
  code: "AUTO-01",
  faculty: "Fakulteti Teknik",
  building: "Objekti B",
  floor: "2",
  capacity: 24,
  status: "active",
  description: "Laborator për sisteme automatike.",
  responsibleUserName: "Arta Berisha",
  zoneCount: 1,
  equipmentCount: 4,
  sensorCount: 6,
};

const zone = {
  id: "3",
  name: "Zona e Mësimit",
  code: "MESIM-1",
  zoneType: "teaching",
  position: { x: 0, y: 0, z: 0 },
  dimensions: { width: 8, height: 3, depth: 6 },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({
    fullName: "Arta Berisha",
    permissions: [
      "laboratories.view",
      "laboratories.manage",
      "laboratories.create",
    ],
    university: { id: "7", name: "Universiteti Testues" },
  });
  api.get.mockImplementation((path) =>
    Promise.resolve(
      path.endsWith("/zones")
        ? { data: { zones: [zone] } }
        : { data: { laboratory } },
    ),
  );
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("LaboratoryDetailPage", () => {
  it("loads tenant details and renders the saved virtual layout", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Laboratori i Automatizimit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Zona e Mësimit")).toBeInTheDocument();
    expect(screen.getByText("4 / 6")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/laboratories/15");
    expect(api.get).toHaveBeenCalledWith("/api/laboratories/15/zones");
  });

  it("updates laboratory data through the protected endpoint", async () => {
    api.put.mockResolvedValue({
      data: {
        laboratory: { ...laboratory, name: "Laboratori i Robotikës" },
        message: "Laboratori u përditësua me sukses.",
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Ndrysho" }));
    fireEvent.change(screen.getByLabelText("Emri"), {
      target: { value: "Laboratori i Robotikës" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ruaj ndryshimet" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/laboratories/15",
        expect.objectContaining({
          name: "Laboratori i Robotikës",
          code: "AUTO-01",
          capacity: 24,
        }),
      ),
    );
    expect(
      await screen.findByText("Laboratori u përditësua me sukses."),
    ).toBeInTheDocument();
  });

  it("hides management actions from read-only roles", async () => {
    useAuthStore.getState().setSession({
      fullName: "Blerim Hoxha",
      permissions: ["laboratories.view"],
      university: { id: "7", name: "Universiteti Testues" },
    });
    renderPage();

    await screen.findByText("Laboratori i Automatizimit");
    expect(
      screen.queryByRole("button", { name: "Ndrysho" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arkivo laboratorin" }),
    ).not.toBeInTheDocument();
  });

  it("archives a laboratory only after confirmation", async () => {
    api.delete.mockResolvedValue({
      data: { message: "Laboratori u arkivua me sukses." },
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Arkivo laboratorin" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Arkivo" }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/api/laboratories/15"),
    );
    expect(await screen.findByText("Lista e laboratorëve")).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/aplikacioni/laboratoret/15"]}>
      <Routes>
        <Route
          path="/aplikacioni/laboratoret/:laboratoryId"
          element={<LaboratoryDetailPage />}
        />
        <Route
          path="/aplikacioni/laboratoret"
          element={<p>Lista e laboratorëve</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
