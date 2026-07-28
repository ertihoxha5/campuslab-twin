import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { createAuthService } from "../src/modules/auth/service.js";
import { hashToken } from "../src/modules/auth/tokens.js";

const secret = "test-access-secret-with-at-least-32-characters";

async function activeUser(overrides = {}) {
  return {
    id: "11",
    universityId: "7",
    fullName: "Arta Krasniqi",
    email: "arta@uni-test.edu",
    passwordHash: await bcrypt.hash("Fjalekalim!2026", 4),
    userStatus: "active",
    universityName: "Universiteti i Testimit",
    universityAcronym: "UT",
    universityStatus: "active",
    roles: ["university_admin"],
    ...overrides,
  };
}

test("active university users receive hashed refresh sessions", async () => {
  const user = await activeUser();
  let createdSession;
  const service = createAuthService({
    repository: {
      findUsersByEmail: async () => [user],
      createSession: async (session) => {
        createdSession = session;
      },
    },
    accessSecret: secret,
  });

  const session = await service.login({
    email: "ARTA@UNI-TEST.EDU",
    password: "Fjalekalim!2026",
    rememberMe: false,
  });

  assert.equal(session.user.university.id, "7");
  assert.equal(session.user.passwordHash, undefined);
  assert.match(session.accessToken, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(createdSession.tokenHash, hashToken(session.refreshToken));
  assert.notEqual(createdSession.tokenHash, session.refreshToken);
});

test("users from pending universities cannot log in", async () => {
  const user = await activeUser({ universityStatus: "pending" });
  const service = createAuthService({
    repository: {
      findUsersByEmail: async () => [user],
    },
    accessSecret: secret,
  });

  await assert.rejects(
    () =>
      service.login({
        email: user.email,
        password: "Fjalekalim!2026",
      }),
    (error) => error.code === "ACCOUNT_UNAVAILABLE" && error.status === 403,
  );
});

test("refresh rotates the opaque token and rejects a replay", async () => {
  const user = await activeUser();
  const original = "refresh-token-original";
  let availableHash = hashToken(original);
  const service = createAuthService({
    repository: {
      rotateSession: async ({ tokenHash, replacementHash }) => {
        if (tokenHash !== availableHash) return null;
        availableHash = replacementHash;
        return user;
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

test("modified access tokens are rejected", async () => {
  const service = createAuthService({
    repository: {},
    accessSecret: secret,
  });

  await assert.rejects(
    () => service.currentUser("modified.token.value"),
    (error) => error.code === "UNAUTHENTICATED" && error.status === 401,
  );
});

test("logout hashes the refresh token before revocation", async () => {
  let revoked;
  const service = createAuthService({
    repository: {
      revokeSession: async (session) => {
        revoked = session;
      },
    },
    accessSecret: secret,
  });

  await service.logout("refresh-token");
  assert.equal(revoked.tokenHash, hashToken("refresh-token"));
  assert.notEqual(revoked.tokenHash, "refresh-token");
});

test("forgot password stores only a hash and sends the one-time token", async () => {
  const user = await activeUser();
  let persisted;
  let delivered;
  const service = createAuthService({
    repository: {
      findUsersByEmail: async () => [user],
      createPasswordReset: async (reset) => {
        persisted = reset;
      },
    },
    accessSecret: secret,
    passwordResetNotifier: {
      send: async (message) => {
        delivered = message;
      },
    },
  });

  await service.forgotPassword({ email: user.email });

  assert.equal(persisted.tokenHash, hashToken(delivered.token));
  assert.notEqual(persisted.tokenHash, delivered.token);
  assert.equal(persisted.token, undefined);
});

test("forgot password silently handles unknown accounts", async () => {
  let notified = false;
  const service = createAuthService({
    repository: {
      findUsersByEmail: async () => [],
    },
    accessSecret: secret,
    passwordResetNotifier: {
      send: async () => {
        notified = true;
      },
    },
  });

  await assert.doesNotReject(() =>
    service.forgotPassword({ email: "panjohur@uni-test.edu" }),
  );
  assert.equal(notified, false);
});

test("reset password hashes the password and consumes the token", async () => {
  let consumed;
  const service = createAuthService({
    repository: {
      consumePasswordReset: async (reset) => {
        consumed = reset;
        return true;
      },
    },
    accessSecret: secret,
  });

  await service.resetPassword({
    token: "one-time-reset-token-that-is-long-enough",
    password: "Fjalekalim!2027",
    confirmPassword: "Fjalekalim!2027",
  });

  assert.equal(
    consumed.tokenHash,
    hashToken("one-time-reset-token-that-is-long-enough"),
  );
  assert.equal(
    await bcrypt.compare("Fjalekalim!2027", consumed.passwordHash),
    true,
  );
  assert.equal(consumed.password, undefined);
});

test("expired or reused reset tokens return a safe Albanian error", async () => {
  const service = createAuthService({
    repository: {
      consumePasswordReset: async () => false,
    },
    accessSecret: secret,
  });

  await assert.rejects(
    () =>
      service.resetPassword({
        token: "expired-reset-token-that-is-long-enough",
        password: "Fjalekalim!2027",
        confirmPassword: "Fjalekalim!2027",
      }),
    (error) => error.code === "INVALID_RESET_TOKEN" && error.status === 422,
  );
});
