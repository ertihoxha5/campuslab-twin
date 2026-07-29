import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  ApiError,
  TENANT_SESSION_INVALID_EVENT,
} from "./client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends cookies and returns the shared success payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { status: "healthy" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest("/api/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
    expect(result.data.status).toBe("healthy");
  });

  it("converts a shared API failure into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "Nuk keni leje." },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(apiRequest("/api/private")).rejects.toMatchObject({
      name: "ApiError",
      code: "FORBIDDEN",
      status: 403,
      message: "Nuk keni leje.",
    });
  });

  it("exports the typed API error class", () => {
    expect(
      new ApiError({ message: "Gabim", code: "TEST", status: 400 }),
    ).toBeInstanceOf(Error);
  });

  it("sends multipart forms without forcing a JSON content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 1 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const form = new FormData();
    form.set("universityName", "Universiteti i Testimit");

    await apiRequest("/api/public/university-registrations", {
      method: "POST",
      body: form,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/university-registrations",
      expect.objectContaining({
        body: form,
        headers: expect.not.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("invalidates only a failed tenant session on protected endpoints", async () => {
    const listener = vi.fn();
    window.addEventListener(TENANT_SESSION_INVALID_EVENT, listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "ACCOUNT_UNAVAILABLE",
              message: "Universiteti nuk është aktiv.",
            },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(apiRequest("/api/notifications")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(TENANT_SESSION_INVALID_EVENT, listener);
  });

  it("does not clear a tenant session for ordinary forbidden responses", async () => {
    const listener = vi.fn();
    window.addEventListener(TENANT_SESSION_INVALID_EVENT, listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "Nuk keni leje." },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(apiRequest("/api/notifications")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(TENANT_SESSION_INVALID_EVENT, listener);
  });
});
