import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store.js";
import { PermissionRoute } from "./PermissionRoute.jsx";

afterEach(() => {
  useAuthStore.getState().resetSession();
});

function renderRoute(permissions) {
  useAuthStore.getState().setSession({ permissions });
  return render(
    <MemoryRouter initialEntries={["/moduli"]}>
      <Routes>
        <Route element={<PermissionRoute anyOf={["laboratories.view"]} />}>
          <Route path="/moduli" element={<p>Moduli privat</p>} />
        </Route>
        <Route path="/aplikacioni/e-ndaluar" element={<p>Qasja u ndalua</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PermissionRoute", () => {
  it("renders a permitted section", () => {
    renderRoute(["laboratories.view"]);
    expect(screen.getByText("Moduli privat")).toBeInTheDocument();
  });

  it("redirects direct navigation without permission", () => {
    renderRoute(["reports.view"]);
    expect(screen.getByText("Qasja u ndalua")).toBeInTheDocument();
  });
});
