import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { createApp } from "../src/app.js";
import { createAccountService } from "../src/modules/account/service.js";

const currentHash = await bcrypt.hash("Fjalekalimi!2026", 4);

test("account profile is normalized and bound to authenticated tenant context", async () => {
  let captured;
  const service = createAccountService({
    passwordRounds: 4,
    repository: {
      async updateProfile(input) {
        captured = input;
        return { id: 9, ...input, createdAt: new Date() };
      },
    },
  });
  const account = await service.updateProfile(
    {
      fullName: "  Ada Test  ",
      email: "ADA@TEST.EDU",
      phone: "",
      jobTitle: "Profesoreshë",
    },
    { universityId: "7", userId: "9", ipAddress: "127.0.0.1" },
  );
  assert.equal(captured.universityId, "7");
  assert.equal(captured.userId, "9");
  assert.equal(captured.email, "ada@test.edu");
  assert.equal(captured.phone, null);
  assert.equal(account.id, "9");
});

test("password change verifies the current password, hashes the new one and rejects reuse", async () => {
  let changed;
  const service = createAccountService({
    passwordRounds: 4,
    repository: {
      async get() {
        return { id: 9, passwordHash: currentHash };
      },
      async updatePassword(input) {
        changed = input;
      },
    },
  });
  await assert.rejects(
    service.changePassword(
      {
        currentPassword: "Gabim!2026xx",
        newPassword: "FjalekalimRi!2026",
        confirmPassword: "FjalekalimRi!2026",
      },
      { universityId: "7", userId: "9" },
    ),
    (error) =>
      error.status === 401 && error.code === "INVALID_CURRENT_PASSWORD",
  );
  await assert.rejects(
    service.changePassword(
      {
        currentPassword: "Fjalekalimi!2026",
        newPassword: "Fjalekalimi!2026",
        confirmPassword: "Fjalekalimi!2026",
      },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422 && error.code === "PASSWORD_UNCHANGED",
  );
  await service.changePassword(
    {
      currentPassword: "Fjalekalimi!2026",
      newPassword: "FjalekalimRi!2026",
      confirmPassword: "FjalekalimRi!2026",
    },
    { universityId: "7", userId: "9" },
  );
  assert.equal(
    await bcrypt.compare("FjalekalimRi!2026", changed.passwordHash),
    true,
  );
  assert.equal(changed.universityId, "7");
});

let server;
let baseUrl;
let capturedContext;
before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        request.auth = {
          universityId: "7",
          userId: "9",
          roles: [],
          permissions: [],
        };
        next();
      },
      accountService: {
        async get(context) {
          capturedContext = context;
          return { id: "9" };
        },
        async updateProfile(_input, context) {
          capturedContext = context;
          return { id: "9" };
        },
        async changePassword(_input, context) {
          capturedContext = context;
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("account endpoints are available to every authenticated tenant user", async () => {
  assert.equal((await fetch(`${baseUrl}/api/account`)).status, 200);
  assert.equal(capturedContext.universityId, "7");
  assert.equal(
    (
      await fetch(`${baseUrl}/api/account`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${baseUrl}/api/account/password`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    200,
  );
  assert.equal(capturedContext.userId, "9");
});
