import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { AccountSettingsPage } from "./AccountSettingsPage.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

const account = {
  id: "9",
  fullName: "Ada Test",
  email: "ada@test.edu",
  phone: "+38344111222",
  jobTitle: "Profesoreshë",
};
const sessionUser = {
  id: "9",
  fullName: "Ada Test",
  email: "ada@test.edu",
  roles: ["academic_staff"],
  permissions: [],
  university: { id: "7", name: "Universiteti Test", acronym: "UT" },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/aplikacioni/llogaria"]}>
      <Routes>
        <Route path="/aplikacioni/llogaria" element={<AccountSettingsPage />} />
        <Route path="/kycu" element={<p>Faqja e kyçjes</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession(sessionUser);
  api.get.mockResolvedValue({ data: { account } });
  api.post.mockResolvedValue({ data: { message: "Dolët me sukses." } });
  api.put.mockImplementation(async (url, body) => {
    if (url === "/api/account") {
      return {
        data: {
          account: { ...account, ...body },
          message: "Profili personal u ruajt me sukses.",
        },
      };
    }
    if (url === "/api/account/password") {
      return { data: { message: "Fjalëkalimi u ndryshua." } };
    }
    throw new Error(`Unexpected PUT ${url}`);
  });
});

describe("AccountSettingsPage", () => {
  it("loads and updates the authenticated user's personal profile", async () => {
    renderPage();
    const fullName = await screen.findByLabelText("Emri i plotë");
    fireEvent.change(fullName, { target: { value: "Ada Berisha" } });
    fireEvent.click(screen.getByRole("button", { name: /Ruaj profilin/i }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/api/account",
        expect.objectContaining({
          fullName: "Ada Berisha",
          email: "ada@test.edu",
        }),
      ),
    );
    expect(useAuthStore.getState().user.fullName).toBe("Ada Berisha");
    expect(
      await screen.findByText("Profili personal u ruajt me sukses."),
    ).toBeInTheDocument();
  });

  it("validates password confirmation before calling the API", async () => {
    renderPage();
    await screen.findByLabelText("Fjalëkalimi aktual");
    fireEvent.change(screen.getByLabelText("Fjalëkalimi aktual"), {
      target: { value: "Fjalekalimi!2026" },
    });
    fireEvent.change(screen.getByLabelText("Fjalëkalimi i ri"), {
      target: { value: "FjalekalimRi!2026" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmo fjalëkalimin e ri"), {
      target: { value: "NukPerputhet!2026" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Ndrysho fjalëkalimin/i }),
    );
    expect(
      await screen.findByText("Fjalëkalimet e reja nuk përputhen."),
    ).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalledWith(
      "/api/account/password",
      expect.anything(),
    );
  });

  it("changes the password, closes the session and redirects to login", async () => {
    renderPage();
    await screen.findByLabelText("Fjalëkalimi aktual");
    fireEvent.change(screen.getByLabelText("Fjalëkalimi aktual"), {
      target: { value: "Fjalekalimi!2026" },
    });
    fireEvent.change(screen.getByLabelText("Fjalëkalimi i ri"), {
      target: { value: "FjalekalimRi!2026" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmo fjalëkalimin e ri"), {
      target: { value: "FjalekalimRi!2026" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Ndrysho fjalëkalimin/i }),
    );
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/api/account/password", {
        currentPassword: "Fjalekalimi!2026",
        newPassword: "FjalekalimRi!2026",
        confirmPassword: "FjalekalimRi!2026",
      }),
    );
    expect(api.post).toHaveBeenCalledWith("/api/auth/logout");
    expect(await screen.findByText("Faqja e kyçjes")).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
