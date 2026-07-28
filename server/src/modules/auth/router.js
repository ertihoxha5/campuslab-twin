import { Router } from "express";
import { success } from "../../utils/api-response.js";
import {
  ACCESS_COOKIE,
  accessCookieOptions,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from "./tokens.js";

export function createAuthRouter({ authService, secureCookies = false }) {
  const router = Router();

  const requestContext = (request) => ({
    userAgent: request.get("user-agent")?.slice(0, 500) ?? null,
    ipAddress: request.ip?.slice(0, 45) ?? null,
  });

  function setSessionCookies(response, session) {
    const refreshMaxAge = session.refreshExpiresAt.getTime() - Date.now();
    response.cookie(
      ACCESS_COOKIE,
      session.accessToken,
      accessCookieOptions({
        secure: secureCookies,
        maxAge: session.accessMaxAge ?? 15 * 60 * 1000,
      }),
    );
    response.cookie(
      REFRESH_COOKIE,
      session.refreshToken,
      refreshCookieOptions({ secure: secureCookies, maxAge: refreshMaxAge }),
    );
  }

  function clearSessionCookies(response) {
    response.clearCookie(
      ACCESS_COOKIE,
      accessCookieOptions({ secure: secureCookies }),
    );
    response.clearCookie(
      REFRESH_COOKIE,
      refreshCookieOptions({ secure: secureCookies }),
    );
  }

  router.post("/login", async (request, response) => {
    const session = await authService.login(
      request.body,
      requestContext(request),
    );
    setSessionCookies(response, session);
    return success(response, { data: { user: session.user } });
  });

  router.post("/refresh", async (request, response) => {
    const session = await authService.refresh(
      request.cookies[REFRESH_COOKIE],
      requestContext(request),
    );
    setSessionCookies(response, session);
    return success(response, { data: { user: session.user } });
  });

  router.get("/me", async (request, response) => {
    const user = await authService.currentUser(request.cookies[ACCESS_COOKIE]);
    return success(response, { data: { user } });
  });

  router.post("/logout", async (request, response) => {
    await authService.logout(
      request.cookies[REFRESH_COOKIE],
      requestContext(request),
    );
    clearSessionCookies(response);
    return success(response, {
      data: { message: "Dolët me sukses nga CampusLab Twin." },
    });
  });

  return router;
}
