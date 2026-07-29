import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { NotificationMenu } from "./NotificationMenu.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({
    data: {
      notifications: [
        {
          id: "4",
          title: "Universiteti u aktivizua",
          message: "Hapësira juaj është aktive.",
          readAt: null,
          createdAt: "2026-07-29T15:00:00.000Z",
        },
      ],
      unreadCount: 1,
    },
  });
});

describe("NotificationMenu", () => {
  it("loads real notifications only when opened", async () => {
    const user = userEvent.setup();
    render(<NotificationMenu />);
    expect(api.get).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Njoftimet" }));

    expect(api.get).toHaveBeenCalledWith("/api/notifications");
    expect(
      await screen.findByText("Universiteti u aktivizua"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 të palexuara")).toBeInTheDocument();
  });

  it("marks a tenant notification as read", async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: {} });
    render(<NotificationMenu />);
    await user.click(screen.getByRole("button", { name: "Njoftimet" }));
    await user.click(await screen.findByText("Universiteti u aktivizua"));

    expect(api.patch).toHaveBeenCalledWith("/api/notifications/4/read", {});
    expect(screen.getByText("0 të palexuara")).toBeInTheDocument();
  });
});
