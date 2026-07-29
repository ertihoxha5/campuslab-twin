import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, TENANT_SESSION_INVALID_EVENT } from "@/api/client.js";
import { useAuthStore } from "@/stores/auth-store.js";
import { AuthSessionBootstrap } from "./AuthSessionBootstrap.jsx";

vi.mock("@/api/client.js", () => ({
  api: { post: vi.fn() },
  TENANT_SESSION_INVALID_EVENT: "clt:tenant-session-invalid",
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().resetSession();
});

describe("AuthSessionBootstrap", () => {
  it("restores an active access session", async () => {
    const user = { id: "11", roles: ["university_admin"] };
    api.post.mockResolvedValue({ data: { user } });

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("authenticated"),
    );
    expect(useAuthStore.getState().user).toEqual(user);
    expect(api.post).toHaveBeenCalledWith("/api/auth/session");
  });

  it("keeps public visitors unauthenticated without a failed request", async () => {
    api.post.mockResolvedValue({ data: { user: null } });

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("unauthenticated"),
    );
    expect(api.post).toHaveBeenCalledWith("/api/auth/session");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("clears a session that cannot be restored", async () => {
    api.post.mockRejectedValue({ status: 500 });

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

  it("removes stale tenant data when a protected request invalidates the session", async () => {
    const user = {
      id: "11",
      fullName: "Përdorues Testues",
      university: { id: "2", acronym: "UT" },
    };
    useAuthStore.getState().setSession(user);

    render(
      <AuthSessionBootstrap>
        <p>Përmbajtja</p>
      </AuthSessionBootstrap>,
    );
    window.dispatchEvent(new Event(TENANT_SESSION_INVALID_EVENT));

    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("unauthenticated"),
    );
    expect(useAuthStore.getState().user).toBeNull();
  });
});
