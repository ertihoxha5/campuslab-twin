import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/app-error.js";

export const ACCESS_COOKIE = "clt_access";
export const REFRESH_COOKIE = "clt_refresh";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function createAccessToken(user, { secret, expiresInMinutes }) {
  return jwt.sign(
    {
      universityId: String(user.universityId),
      roles: user.roles,
      type: "university",
    },
    secret,
    {
      subject: String(user.id),
      expiresIn: `${expiresInMinutes}m`,
      issuer: "campuslab-twin",
      audience: "campuslab-twin-web",
    },
  );
}

export function createPlatformAccessToken(
  administrator,
  { secret, expiresInMinutes },
) {
  return jwt.sign(
    {
      roles: ["platform_admin"],
      type: "platform_admin",
    },
    secret,
    {
      subject: String(administrator.id),
      expiresIn: `${expiresInMinutes}m`,
      issuer: "campuslab-twin",
      audience: "campuslab-twin-platform",
    },
  );
}

export function verifyAccessToken(token, secret) {
  try {
    return jwt.verify(token, secret, {
      issuer: "campuslab-twin",
      audience: "campuslab-twin-web",
    });
  } catch {
    throw new AppError({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Sesioni juaj nuk është i vlefshëm. Ju lutemi kyçuni përsëri.",
    });
  }
}

export function verifyPlatformAccessToken(token, secret) {
  try {
    return jwt.verify(token, secret, {
      issuer: "campuslab-twin",
      audience: "campuslab-twin-platform",
    });
  } catch {
    throw new AppError({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Sesioni juaj nuk është i vlefshëm. Ju lutemi kyçuni përsëri.",
    });
  }
}

export function accessCookieOptions({ secure, maxAge }) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function refreshCookieOptions({ secure, maxAge }) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge,
  };
}
