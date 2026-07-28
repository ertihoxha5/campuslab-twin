import bcrypt from "bcrypt";
import { AppError } from "../../utils/app-error.js";
import {
  createPlatformAccessToken,
  createRefreshToken,
  hashToken,
  verifyPlatformAccessToken,
} from "../auth/tokens.js";
import { validateLoginInput } from "../auth/validation.js";

const authenticationError = () =>
  new AppError({
    status: 401,
    code: "INVALID_CREDENTIALS",
    message: "Email-i ose fjalëkalimi nuk është i saktë.",
  });

function publicAdministrator(administrator) {
  return {
    id: administrator.id,
    fullName: administrator.fullName,
    email: administrator.email,
    accountType: "platform_admin",
    roles: ["platform_admin"],
  };
}

export function createPlatformAuthService({
  repository,
  accessSecret,
  accessTokenMinutes = 15,
  refreshTokenDays = 7,
}) {
  const expiry = () =>
    new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
  const accessToken = (administrator) =>
    createPlatformAccessToken(administrator, {
      secret: accessSecret,
      expiresInMinutes: accessTokenMinutes,
    });

  return {
    async login(input, context = {}) {
      const credentials = validateLoginInput(input);
      const administrator = await repository.findByEmail(credentials.email);
      const validPassword =
        administrator &&
        (await bcrypt.compare(
          credentials.password,
          administrator.passwordHash,
        ));

      if (!validPassword || administrator.status !== "active") {
        throw authenticationError();
      }

      const refreshToken = createRefreshToken();
      const expiresAt = expiry();
      await repository.createSession({
        administrator,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        ...context,
      });

      return {
        administrator: publicAdministrator(administrator),
        accessToken: accessToken(administrator),
        accessMaxAge: accessTokenMinutes * 60 * 1000,
        refreshToken,
        refreshExpiresAt: expiresAt,
      };
    },

    async refresh(token, context = {}) {
      if (!token) throw authenticationError();
      const replacement = createRefreshToken();
      const expiresAt = expiry();
      const administrator = await repository.rotateSession({
        tokenHash: hashToken(token),
        replacementHash: hashToken(replacement),
        expiresAt,
        ...context,
      });

      if (!administrator || administrator.status !== "active") {
        throw authenticationError();
      }

      return {
        administrator: publicAdministrator(administrator),
        accessToken: accessToken(administrator),
        accessMaxAge: accessTokenMinutes * 60 * 1000,
        refreshToken: replacement,
        refreshExpiresAt: expiresAt,
      };
    },

    async currentAdministrator(token) {
      if (!token) throw authenticationError();
      const payload = verifyPlatformAccessToken(token, accessSecret);
      if (payload.type !== "platform_admin") throw authenticationError();
      const administrator = await repository.findActiveById(payload.sub);
      if (!administrator || administrator.status !== "active") {
        throw authenticationError();
      }
      return publicAdministrator(administrator);
    },

    async logout(token, context = {}) {
      if (token) {
        await repository.revokeSession({
          tokenHash: hashToken(token),
          ...context,
        });
      }
    },
  };
}
