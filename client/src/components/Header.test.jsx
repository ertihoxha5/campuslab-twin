import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header.jsx";

describe("Header keyboard accessibility", () => {
  it("exposes landmarks and reaches the theme control with Tab", async () => {
    const keyboard = userEvent.setup();
    const toggleTheme = vi.fn();
    render(
      <MemoryRouter>
        <Header theme="light" onToggleTheme={toggleTheme} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("navigation", { name: "Navigimi kryesor" }),
    ).toBeInTheDocument();
    const theme = screen.getByRole("button", { name: /pamjen e err/i });
    for (
      let step = 0;
      step < 12 && document.activeElement !== theme;
      step += 1
    ) {
      await keyboard.tab();
    }
    expect(theme).toHaveFocus();
    await keyboard.keyboard("{Enter}");
    expect(toggleTheme).toHaveBeenCalledOnce();
  });

  it("opens the mobile navigation from the keyboard and closes it with Escape", async () => {
    const keyboard = userEvent.setup();
    render(
      <MemoryRouter>
        <Header theme="dark" onToggleTheme={() => {}} />
      </MemoryRouter>,
    );
    const menu = screen.getByRole("button", { name: /Hap menun/i });
    menu.focus();
    await keyboard.keyboard("{Enter}");
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveAttribute("aria-controls", "main-navigation");
    await keyboard.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();
  });
});
