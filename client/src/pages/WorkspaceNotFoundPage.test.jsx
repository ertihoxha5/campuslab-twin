import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { WorkspaceNotFoundPage } from "./WorkspaceNotFoundPage.jsx";

describe("WorkspaceNotFoundPage", () => {
  it("keeps a missing private route inside the university workspace", () => {
    render(
      <MemoryRouter>
        <WorkspaceNotFoundPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Faqja private nuk u gjet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kthehu te përmbledhja" }),
    ).toHaveAttribute("href", "/aplikacioni");
  });
});
