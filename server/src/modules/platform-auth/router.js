import { Router } from "express";
import { success } from "../../utils/api-response.js";

const ACCESS_COOKIE = "clt_platform_access";
const REFRESH_COOKIE = "clt_platform_refresh";

export function createPlatformAuthRouter({
  platformAuthService,
  secureCookies = false,
}) {
  const router = Router();
  const context = (request) => ({
    userAgent: request.get("user-agent")?.slice(0, 500) ?? null,
    ipAddress: request.ip?.slice(0, 45) ?? null,
  });
  const accessOptions = (maxAge) => ({
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/api/platform",
    maxAge,
  });
  const refreshOptions = (maxAge) => ({
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/api/platform/auth",
    maxAge,
  });
  const setCookies = (response, session) => {
    response.cookie(
      ACCESS_COOKIE,
      session.accessToken,
      accessOptions(session.accessMaxAge),
    );
    response.cookie(
      REFRESH_COOKIE,
      session.refreshToken,
      refreshOptions(session.refreshExpiresAt.getTime() - Date.now()),
    );
  };
  const clearCookies = (response) => {
    response.clearCookie(ACCESS_COOKIE, accessOptions());
    response.clearCookie(REFRESH_COOKIE, refreshOptions());
  };

  router.post("/login", async (request, response) => {
    const session = await platformAuthService.login(
      request.body,
      context(request),
    );
    setCookies(response, session);
    return success(response, {
      data: { administrator: session.administrator },
    });
  });

  router.post("/refresh", async (request, response) => {
    const session = await platformAuthService.refresh(
      request.cookies[REFRESH_COOKIE],
      context(request),
    );
    setCookies(response, session);
    return success(response, {
      data: { administrator: session.administrator },
    });
  });

  router.get("/me", async (request, response) => {
    const administrator = await platformAuthService.currentAdministrator(
      request.cookies[ACCESS_COOKIE],
    );
    return success(response, { data: { administrator } });
  });

  router.post("/logout", async (request, response) => {
    await platformAuthService.logout(
      request.cookies[REFRESH_COOKIE],
      context(request),
    );
    clearCookies(response);
    return success(response, {
      data: { message: "Dolët me sukses nga administrimi i platformës." },
    });
  });

  return router;
}
