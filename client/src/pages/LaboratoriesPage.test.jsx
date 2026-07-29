import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { LaboratoriesPage } from "./LaboratoriesPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const administrator = {
  fullName: "Arta Berisha",
  permissions: [
    "laboratories.view",
    "laboratories.create",
    "laboratories.manage",
  ],
  university: { id: "7", name: "Universiteti Testues" },
};

const laboratory = {
  id: "15",
  name: "Laboratori i Automatizimit",
  code: "AUTO-01",
  faculty: "Fakulteti Teknik",
  building: "Objekti B",
  floor: "2",
  capacity: 24,
  status: "active",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession(administrator);
});

afterEach(() => {
  useAuthStore.getState().resetSession();
});

describe("LaboratoriesPage", () => {
  it("renders tenant laboratories and sends search filters to the API", async () => {
    api.get.mockResolvedValue({
      data: { laboratories: [laboratory] },
      meta: { pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderPage();

    expect(
      await screen.findByText("Laboratori i Automatizimit"),
    ).toBeInTheDocument();
    expect(screen.getByText("AUTO-01")).toBeInTheDocument();
    expect(screen.getByText("24 persona")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Kërko laboratorët"), {
      target: { value: "Automatizim" },
    });
    fireEvent.submit(screen.getByLabelText("Kërko laboratorët").form);

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/laboratories?page=1&pageSize=12&search=Automatizim",
      ),
    );
  });

  it("validates and creates a laboratory through the real endpoint", async () => {
    api.get.mockImplementation((path) =>
      Promise.resolve(
        path === "/api/laboratories/responsible-users"
          ? {
              data: {
                users: [
                  {
                    id: "9",
                    fullName: "Arta Berisha",
                    jobTitle: "Menaxhere laboratori",
                    roles: ["lab_manager"],
                  },
                ],
              },
            }
          : {
              data: { laboratories: [] },
              meta: { pagination: { page: 1, pages: 0, total: 0 } },
            },
      ),
    );
    api.post.mockResolvedValue({
      data: {
        laboratory,
        message: "Laboratori u krijua me sukses.",
      },
    });

    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "Laborator i ri" }),
    );
    fireEvent.change(screen.getByLabelText("Emri"), {
      target: { value: "Laboratori i Automatizimit" },
    });
    fireEvent.change(screen.getByLabelText("Kodi"), {
      target: { value: "AUTO-01" },
    });
    fireEvent.change(screen.getByLabelText("Fakulteti"), {
      target: { value: "Fakulteti Teknik" },
    });
    fireEvent.change(screen.getByLabelText("Ndërtesa"), {
      target: { value: "Objekti B" },
    });
    fireEvent.change(screen.getByLabelText("Kati"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Kapaciteti"), {
      target: { value: "24" },
    });
    fireEvent.change(screen.getByLabelText("Përgjegjësi"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Krijo laboratorin" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/laboratories", {
        name: "Laboratori i Automatizimit",
        code: "AUTO-01",
        faculty: "Fakulteti Teknik",
        building: "Objekti B",
        floor: "2",
        capacity: 24,
        status: "active",
        responsibleUserId: "9",
        description: "",
      }),
    );
    expect(
      await screen.findByText("Laboratori u krijua me sukses."),
    ).toBeInTheDocument();
  });

  it("hides creation controls from read-only roles", async () => {
    useAuthStore.getState().setSession({
      ...administrator,
      permissions: ["laboratories.view"],
    });
    api.get.mockResolvedValue({
      data: { laboratories: [] },
      meta: { pagination: { page: 1, pages: 0, total: 0 } },
    });

    renderPage();

    expect(
      await screen.findByText(
        "Nuk keni ende laboratorë të caktuar për këtë llogari.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Laborator i ri" }),
    ).not.toBeInTheDocument();
  });

  it("lists and restores an archived laboratory", async () => {
    api.get.mockImplementation((path) =>
      Promise.resolve(
        path === "/api/laboratories/responsible-users"
          ? { data: { users: [] } }
          : {
              data: {
                laboratories: [
                  archivePath(path)
                    ? { ...laboratory, status: "archived" }
                    : laboratory,
                ],
              },
              meta: { pagination: { page: 1, pages: 1, total: 1 } },
            },
      ),
    );
    api.patch.mockResolvedValue({
      data: {
        laboratory: { ...laboratory, status: "active" },
        message: "Laboratori u rikthye me sukses.",
      },
    });

    renderPage();
    await screen.findByText("Laboratori i Automatizimit");
    fireEvent.click(screen.getByRole("button", { name: "Arkivi" }));

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/api/laboratories/archived?page=1&pageSize=12",
      ),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Rikthe laboratorin" }),
    );

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/api/laboratories/15/restore"),
    );
    expect(
      await screen.findByText("Laboratori u rikthye me sukses."),
    ).toBeInTheDocument();
  });
});

function archivePath(path) {
  return path.startsWith("/api/laboratories/archived?");
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LaboratoriesPage />
    </MemoryRouter>,
  );
}
