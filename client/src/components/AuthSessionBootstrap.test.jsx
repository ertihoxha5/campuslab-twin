import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { AuthSessionBootstrap } from "./AuthSessionBootstrap.jsx";

vi.mock("@/api/client.js", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().resetSession();
});

describe("AuthSessionBootstrap", () => {
  it("restores an active access session", async () => {
    const user = { id: "11", roles: ["university_admin"] };
    api.get.mockResolvedValue({ data: { user } });

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("authenticated"),
    );
    expect(useAuthStore.getState().user).toEqual(user);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("uses the refresh cookie after an expired access session", async () => {
    const user = { id: "12", roles: ["observer"] };
    api.get.mockRejectedValue({ status: 401 });
    api.post.mockResolvedValue({ data: { user } });

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("authenticated"),
    );
    expect(api.post).toHaveBeenCalledWith("/api/auth/refresh");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("clears a session that cannot be restored", async () => {
    api.get.mockRejectedValue({ status: 401 });
    api.post.mockRejectedValue({ status: 401 });

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("unauthenticated"),
    );
    expect(useAuthStore.getState().user).toBeNull();
  });
});
