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
    expect(
      screen.getAllByRole("link", { name: "Kyçu" }).length,
    ).toBeGreaterThan(1);
    expect(screen.queryByText(/Kërko Demo/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Laboratorë më të qartë. Vendime më të sigurta.",
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
        name: "Një themel digjital për laboratorët universitarë.",
      }),
    ).toBeInTheDocument();
  });

  it("shows honest public explanations, process, FAQ, and contact", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Një pasqyrë digjitale e laboratorit fizik.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Përpara se të regjistroheni." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Na kontaktoni/ })).toHaveAttribute(
      "href",
      "/kontakti",
    );
    expect(screen.queryByText(/dashboard demo/i)).not.toBeInTheDocument();
  });
});
