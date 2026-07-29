import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceErrorBoundary } from "./WorkspaceErrorBoundary.jsx";

function BrokenSection() {
  throw new Error("Dështim prove");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WorkspaceErrorBoundary", () => {
  it("contains unexpected errors inside the private workspace", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter>
        <WorkspaceErrorBoundary>
          <BrokenSection />
        </WorkspaceErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Faqja nuk mund të shfaqet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kthehu te përmbledhja" }),
    ).toHaveAttribute("href", "/aplikacioni");
  });
});
