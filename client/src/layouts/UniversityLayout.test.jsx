import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store.js";
import { UniversityLayout } from "./UniversityLayout.jsx";

afterEach(() => {
  useAuthStore.getState().resetSession();
  window.localStorage.removeItem("clt-sidebar-collapsed");
  document.title = "CampusLab Twin";
});

function renderLayout(user, initialEntry = "/aplikacioni") {
  useAuthStore.getState().setSession(user);
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/aplikacioni" element={<UniversityLayout />}>
          <Route index element={<p>Përmbajtja private</p>} />
          <Route path="laboratoret" element={<p>Lista e laboratorëve</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const adminUser = {
  fullName: "Arta Berisha",
  roles: ["university_admin"],
  permissions: [
    "laboratories.view", "monitoring.view", "reports.view",
    "university.users.manage", "university.profile.manage",
  ],
  university: { id: "2", name: "Universiteti Testues", acronym: "UT", logoFileId: null },
};

describe("UniversityLayout", () => {
  it("shows grouped permitted navigation and authenticated university context", () => {
    renderLayout(adminUser);

    expect(screen.getByText("Universiteti Testues")).toBeInTheDocument();
    expect(screen.getByText("Arta Berisha")).toBeInTheDocument();
    expect(screen.getByText("Operacionet")).toBeInTheDocument();
    expect(screen.getByText("Infrastruktura")).toBeInTheDocument();
    expect(screen.getByText("Administrimi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Laboratorët/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Përdoruesit/ })).toBeInTheDocument();
    expect(screen.getByText("Përmbajtja private")).toBeInTheDocument();
    expect(document.title).toBe("Përmbledhja · UT");
  });

  it("hides management sections without their permissions", () => {
    renderLayout({
      ...adminUser,
      fullName: "Luan Hoxha",
      roles: ["observer"],
      permissions: ["laboratories.view", "monitoring.view", "reports.view"],
    });

    expect(screen.queryByRole("link", { name: /Përdoruesit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Cilësimet/ })).not.toBeInTheDocument();
  });

  it("persists the collapsed sidebar preference", () => {
    const { container } = renderLayout(adminUser);
    fireEvent.click(screen.getByRole("button", { name: "Ngushto navigimin" }));

    expect(container.querySelector(".university-shell")).toHaveClass("is-collapsed");
    expect(window.localStorage.getItem("clt-sidebar-collapsed")).toBe("true");
    expect(screen.getByRole("link", { name: "Laboratorët" })).toHaveAttribute("title", "Laboratorët");
  });

  it("updates the breadcrumb and document title for a nested page", () => {
    renderLayout(adminUser, "/aplikacioni/laboratoret");
    expect(screen.getByLabelText("Pozicioni aktual")).toHaveTextContent("UTLaboratorët");
    expect(document.title).toBe("Laboratorët · UT");
  });
});
