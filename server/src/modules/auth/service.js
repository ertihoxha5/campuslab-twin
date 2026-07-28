import bcrypt from "bcrypt";
import { AppError } from "../../utils/app-error.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
} from "./tokens.js";
import { validateLoginInput } from "./validation.js";

const invalidCredentials = () =>
  new AppError({
    status: 401,
    code: "INVALID_CREDENTIALS",
    message: "Email-i ose fjalëkalimi nuk është i saktë.",
  });

const unavailableAccount = () =>
  new AppError({
    status: 403,
    code: "ACCOUNT_UNAVAILABLE",
    message:
      "Llogaria nuk është aktive. Kontaktoni administratorin e universitetit.",
  });

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    university: {
      id: user.universityId,
      name: user.universityName,
      acronym: user.universityAcronym,
    },
    roles: user.roles,
  };
}

export function createAuthService({
  repository,
  accessSecret,
  accessTokenMinutes = 15,
  refreshTokenDays = 7,
}) {
  function issueAccessToken(user) {
    return createAccessToken(user, {
      secret: accessSecret,
      expiresInMinutes: accessTokenMinutes,
    });
  }

  function refreshExpiry(rememberMe = false) {
    const days = rememberMe
      ? Math.min(refreshTokenDays * 4, 30)
      : refreshTokenDays;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  return {
    async login(input, context = {}) {
      const credentials = validateLoginInput(input);
      const candidates = await repository.findUsersByEmail(credentials.email);
      let user = null;

      for (const candidate of candidates) {
        if (
          await bcrypt.compare(credentials.password, candidate.passwordHash)
        ) {
          user = candidate;
          break;
        }
      }

      if (!user) throw invalidCredentials();
      if (user.userStatus !== "active" || user.universityStatus !== "active") {
        throw unavailableAccount();
      }

      const refreshToken = createRefreshToken();
      const expiresAt = refreshExpiry(credentials.rememberMe);
      await repository.createSession({
        user,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        ...context,
      });

      return {
        user: publicUser(user),
        accessToken: issueAccessToken(user),
        accessMaxAge: accessTokenMinutes * 60 * 1000,
        refreshToken,
        refreshExpiresAt: expiresAt,
      };
    },

    async refresh(refreshToken, context = {}) {
      if (!refreshToken) throw invalidCredentials();

      const replacement = createRefreshToken();
      const expiresAt = refreshExpiry();
      const user = await repository.rotateSession({
        tokenHash: hashToken(refreshToken),
        replacementHash: hashToken(replacement),
        expiresAt,
        ...context,
      });

      if (
        !user ||
        user.userStatus !== "active" ||
        user.universityStatus !== "active"
      ) {
        throw invalidCredentials();
      }

      return {
        user: publicUser(user),
        accessToken: issueAccessToken(user),
        accessMaxAge: accessTokenMinutes * 60 * 1000,
        refreshToken: replacement,
        refreshExpiresAt: expiresAt,
      };
    },

    async currentUser(accessToken) {
      if (!accessToken) throw invalidCredentials();
      const payload = verifyAccessToken(accessToken, accessSecret);
      const user = await repository.findActiveUserById(
        payload.sub,
        payload.universityId,
      );

      if (
        !user ||
        user.userStatus !== "active" ||
        user.universityStatus !== "active"
      ) {
        throw unavailableAccount();
      }
      return publicUser(user);
    },

    async logout(refreshToken, context = {}) {
      if (refreshToken) {
        await repository.revokeSession({
          tokenHash: hashToken(refreshToken),
          ...context,
        });
      }
    },
  };
}
