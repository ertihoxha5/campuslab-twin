import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError } from "./client.js";

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
});
