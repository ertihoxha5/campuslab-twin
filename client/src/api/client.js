const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const TENANT_SESSION_INVALID_EVENT = "clt:tenant-session-invalid";

export class ApiError extends Error {
  constructor({ message, code = "REQUEST_ERROR", status = 500, details }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, headers, signal } = {},
) {
  const isFormData = body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    signal,
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    notifyInvalidTenantSession(path, response.status, payload?.error?.code);
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code,
      message:
        payload?.error?.message ??
        "Kërkesa nuk mund të përfundohej. Ju lutemi provoni përsëri.",
      details: payload?.error?.details,
    });
  }

  return payload;
}

function notifyInvalidTenantSession(path, status, code) {
  const isTenantProtectedPath =
    path.startsWith("/api/") &&
    !path.startsWith("/api/auth/") &&
    !path.startsWith("/api/public/") &&
    !path.startsWith("/api/platform/") &&
    path !== "/api/health";
  const sessionIsInvalid =
    status === 401 || (status === 403 && code === "ACCOUNT_UNAVAILABLE");

  if (
    isTenantProtectedPath &&
    sessionIsInvalid &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new Event(TENANT_SESSION_INVALID_EVENT));
  }
}

async function parsePayload(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) =>
    apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) =>
    apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
  async download(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: "include",
      signal: options.signal,
      headers: { Accept: "application/pdf, text/csv" },
    });
    if (!response.ok) {
      const payload = await parsePayload(response);
      notifyInvalidTenantSession(path, response.status, payload?.error?.code);
      throw new ApiError({
        status: response.status,
        code: payload?.error?.code,
        message: payload?.error?.message ?? "Raporti nuk mund të shkarkohej.",
      });
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "raporti";
    return { blob: await response.blob(), filename };
  },
};
