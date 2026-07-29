import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store.js";
import { UniversityLayout } from "./UniversityLayout.jsx";

afterEach(() => {
  useAuthStore.getState().resetSession();
  document.title = "CampusLab Twin";
});

function renderLayout(user) {
  useAuthStore.getState().setSession(user);
  return render(
    <MemoryRouter initialEntries={["/aplikacioni"]}>
      <Routes>
        <Route path="/aplikacioni" element={<UniversityLayout />}>
          <Route index element={<p>Përmbajtja private</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("UniversityLayout", () => {
  it("shows authenticated university branding and permitted navigation", () => {
    renderLayout({
      fullName: "Arta Berisha",
      roles: ["university_admin"],
      permissions: [
        "laboratories.view",
        "monitoring.view",
        "reports.view",
        "university.users.manage",
        "university.profile.manage",
      ],
      university: {
        id: "2",
        name: "Universiteti Testues",
        acronym: "UT",
        logoFileId: null,
      },
    });

    expect(screen.getByText("Universiteti Testues")).toBeInTheDocument();
    expect(screen.getByText("Arta Berisha")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Laboratorët/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Përdoruesit/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Përmbajtja private")).toBeInTheDocument();
    expect(document.title).toBe("Përmbledhja · UT");
  });

  it("hides management sections without their permissions", () => {
    renderLayout({
      fullName: "Luan Hoxha",
      roles: ["observer"],
      permissions: ["laboratories.view", "monitoring.view", "reports.view"],
      university: {
        id: "3",
        name: "Universiteti Vëzhgues",
        acronym: "UV",
        logoFileId: null,
      },
    });

    expect(
      screen.queryByRole("link", { name: /Përdoruesit/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Cilësimet/ }),
    ).not.toBeInTheDocument();
  });
});
