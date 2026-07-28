import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { createPlatformAuthService } from "../src/modules/platform-auth/service.js";
import { hashToken } from "../src/modules/auth/tokens.js";

const secret = "platform-test-secret-with-at-least-32-characters";

async function administrator(overrides = {}) {
  return {
    id: "3",
    fullName: "Administratori i Platformës",
    email: "admin@campuslab.demo",
    passwordHash: await bcrypt.hash("CampusLab!2026", 4),
    status: "active",
    ...overrides,
  };
}

test("active platform administrator receives an isolated session", async () => {
  const admin = await administrator();
  let stored;
  const service = createPlatformAuthService({
    repository: {
      findByEmail: async () => admin,
      createSession: async (session) => {
        stored = session;
      },
    },
    accessSecret: secret,
  });

  const session = await service.login({
    email: admin.email,
    password: "CampusLab!2026",
  });

  assert.equal(session.administrator.accountType, "platform_admin");
  assert.deepEqual(session.administrator.roles, ["platform_admin"]);
  assert.equal(session.administrator.passwordHash, undefined);
  assert.equal(stored.tokenHash, hashToken(session.refreshToken));
  assert.equal(session.accessToken.includes(admin.email), false);
});

test("inactive platform administrators cannot log in", async () => {
  const admin = await administrator({ status: "inactive" });
  const service = createPlatformAuthService({
    repository: { findByEmail: async () => admin },
    accessSecret: secret,
  });

  await assert.rejects(
    () =>
      service.login({
        email: admin.email,
        password: "CampusLab!2026",
      }),
    (error) => error.code === "INVALID_CREDENTIALS",
  );
});

test("platform refresh tokens rotate and cannot be replayed", async () => {
  const admin = await administrator();
  const original = "platform-refresh-original";
  let validHash = hashToken(original);
  const service = createPlatformAuthService({
    repository: {
      rotateSession: async ({ tokenHash, replacementHash }) => {
        if (tokenHash !== validHash) return null;
        validHash = replacementHash;
        return admin;
      },
    },
    accessSecret: secret,
  });

  const rotated = await service.refresh(original);
  assert.notEqual(rotated.refreshToken, original);
  await assert.rejects(
    () => service.refresh(original),
    (error) => error.code === "INVALID_CREDENTIALS",
  );
});
