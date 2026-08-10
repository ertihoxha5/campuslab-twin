import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { UniversityUsersPage } from "./UniversityUsersPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const user = {
  id: "12",
  fullName: "Ada Testuese",
  email: "ada@example.edu",
  phone: null,
  jobTitle: "Teknike",
  status: "active",
  roles: ["technician"],
  laboratories: [{ id: "15", name: "Laboratori A" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url.startsWith("/api/university/users?"))
      return { data: { users: [user], pagination: { total: 1 } } };
    if (url === "/api/university/users/options")
      return {
        data: {
          options: {
            roles: [
              {
                id: "3",
                code: "technician",
                name: "Teknik",
                description: "Mirëmban asetet",
              },
            ],
            laboratories: [{ id: "15", name: "Laboratori A", code: "LAB-A" }],
          },
        },
      };
    if (url === "/api/university/users/12")
      return {
        data: {
          user: { ...user, lastLoginAt: "2026-08-10T09:00:00.000Z" },
          activity: [
            {
              id: "31",
              action: "auth.login",
              description: "Përdoruesi u kyç me sukses.",
              actorName: "Ada Testuese",
              createdAt: "2026-08-10T09:00:00.000Z",
            },
          ],
        },
      };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({
    data: { user, message: "Përdoruesi u krijua me sukses." },
  });
  api.put.mockResolvedValue({
    data: { user, message: "Përdoruesi u përditësua me sukses." },
  });
  api.patch.mockResolvedValue({
    data: {
      user: { ...user, status: "inactive" },
      message: "Përdoruesi u çaktivizua.",
    },
  });
});

describe("UniversityUsersPage", () => {
  it("renders tenant users and applies search and status filters", async () => {
    render(<UniversityUsersPage />);
    expect(await screen.findByText("Ada Testuese")).toBeInTheDocument();
    expect(screen.getByText("Laboratori A")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Kërko përdoruesit"), {
      target: { value: "Ada" },
    });
    fireEvent.submit(
      screen.getByLabelText("Kërko përdoruesit").closest("form"),
    );
    fireEvent.change(screen.getByLabelText("Filtro statusin"), {
      target: { value: "active" },
    });
    await waitFor(() =>
      expect(
        api.get.mock.calls.some(
          ([url]) => url.includes("search=A") && url.includes("status=active"),
        ),
      ).toBe(true),
    );
  });

  it("creates a user with selected role and laboratory", async () => {
    render(<UniversityUsersPage />);
    await screen.findByText("Ada Testuese");
    fireEvent.click(screen.getByRole("button", { name: /Përdorues i ri/i }));
    fireEvent.change(screen.getByLabelText("Emri i plotë"), {
      target: { value: "Besa Test" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "besa@example.edu" },
    });
    fireEvent.change(screen.getByLabelText("Fjalëkalimi fillestar"), {
      target: { value: "Fjalekalim!2026" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Teknik/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Laboratori A/i }));
    fireEvent.click(screen.getByRole("button", { name: /Krijo përdoruesin/i }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/university/users",
        expect.objectContaining({
          fullName: "Besa Test",
          roles: ["technician"],
          laboratoryIds: ["15"],
        }),
      ),
    );
  });

  it("loads the full profile and recent activity on demand", async () => {
    render(<UniversityUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Shiko/i }));
    expect(
      await screen.findByRole("dialog", { name: "Ada Testuese" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hyrje në sistem")).toBeInTheDocument();
    expect(screen.getByText("Përdoruesi u kyç me sukses.")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/university/users/12");
    fireEvent.click(screen.getByRole("button", { name: "Mbyll profilin" }));
    expect(
      screen.queryByRole("dialog", { name: "Ada Testuese" }),
    ).not.toBeInTheDocument();
  });

  it("edits access and changes the user status", async () => {
    render(<UniversityUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Ndrysho/i }));
    fireEvent.change(screen.getByLabelText("Pozita"), {
      target: { value: "Teknike e lartë" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ruaj ndryshimet/i }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/university/users/12",
        expect.objectContaining({
          jobTitle: "Teknike e lartë",
          roles: ["technician"],
        }),
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Çaktivizo/i }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/api/university/users/12/status",
        { status: "inactive" },
      ),
    );
  });
});
