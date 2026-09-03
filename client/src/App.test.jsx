import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  vi.stubGlobal("scrollTo", vi.fn());
  localStorage.clear();
});

describe("public frontend", () => {
  it("shows registration and login actions without the old demo action", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByRole("link", { name: /Regjistro Universitetin/i }).length,
    ).toBeGreaterThan(1);
    expect(screen.queryByText(/Kërko Demo/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Laboratori juaj, i kuptueshëm në çdo moment.",
      }),
    ).toBeInTheDocument();
  });

  it("renders page content through routing", () => {
    render(
      <MemoryRouter initialEntries={["/rreth-nesh"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Historia e binjakut digjital, deri te laboratori juaj.",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the homepage explanation and journey sections", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Gjithçka që ndodh në laborator, në një pamje të vetme.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Nga regjistrimi te laboratori juaj digjital.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/dashboard demo/i)).not.toBeInTheDocument();
  });
});
