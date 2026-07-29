import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlatformAuthStore } from "@/stores/platform-auth-store.js";
import { PlatformProtectedRoute } from "./PlatformProtectedRoute.jsx";

vi.mock("@/api/client.js", () => ({
  api: { post: vi.fn(() => new Promise(() => {})) },
}));

afterEach(() => {
  usePlatformAuthStore.getState().resetSession();
});

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/administrimi"]}>
      <Routes>
        <Route element={<PlatformProtectedRoute />}>
          <Route path="/administrimi" element={<p>Paneli i platformës</p>} />
        </Route>
        <Route path="/administrimi/kycu" element={<p>Kyçja e platformës</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlatformProtectedRoute", () => {
  it("shows a session verification state", () => {
    renderRoute();
    expect(
      screen.getByText("Po verifikohet sesioni i administrimit…"),
    ).toBeInTheDocument();
  });

  it("redirects visitors to the separate platform login", () => {
    usePlatformAuthStore.getState().clearSession();
    renderRoute();
    expect(screen.getByText("Kyçja e platformës")).toBeInTheDocument();
  });

  it("renders the platform area for an authenticated administrator", () => {
    usePlatformAuthStore
      .getState()
      .setSession({ id: "1", fullName: "Administratori" });
    renderRoute();
    expect(screen.getByText("Paneli i platformës")).toBeInTheDocument();
  });
});
