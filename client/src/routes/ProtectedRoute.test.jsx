import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store.js";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

afterEach(() => {
  useAuthStore.getState().resetSession();
});

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Hapësira private</p>} />
        </Route>
        <Route path="/kycu" element={<p>Faqja e kyçjes</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("waits while the real session state is unknown", () => {
    renderProtectedRoute();

    expect(screen.getByText("Po verifikohet sesioni...")).toBeInTheDocument();
  });

  it("redirects an unauthenticated session to login", () => {
    useAuthStore.getState().clearSession();
    renderProtectedRoute();

    expect(screen.getByText("Faqja e kyçjes")).toBeInTheDocument();
  });

  it("renders protected content for an authenticated session", () => {
    useAuthStore.getState().setSession({ id: 1, roles: ["university_admin"] });
    renderProtectedRoute();

    expect(screen.getByText("Hapësira private")).toBeInTheDocument();
  });
});
