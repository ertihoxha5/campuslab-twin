import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import { permissions } from "../src/authorization/permissions.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { createPlatformAuthentication } from "../src/middleware/authenticate-platform.js";
import { createTenantAuthentication } from "../src/middleware/authenticate-tenant.js";
import { requirePermissions } from "../src/middleware/require-permission.js";
import {
  createAccessToken,
  createPlatformAccessToken,
} from "../src/modules/auth/tokens.js";

const secret = "authorization-test-secret-with-32-characters";
const tenantUsers = new Map([
  [
    "10",
    {
      id: "10",
      universityId: "7",
      userStatus: "active",
      universityStatus: "active",
      roles: ["observer"],
    },
  ],
  [
    "11",
    {
      id: "11",
      universityId: "7",
      userStatus: "active",
      universityStatus: "active",
      roles: ["university_admin"],
    },
  ],
  [
    "12",
    {
      id: "12",
      universityId: "7",
      userStatus: "active",
      universityStatus: "suspended",
      roles: ["university_admin"],
    },
  ],
]);

const tenantRepository = {
  async findActiveUserById(userId, universityId) {
    const user = tenantUsers.get(String(userId));
    return user?.universityId === String(universityId) ? user : null;
  },
};

const platformRepository = {
  async findActiveById(id) {
    return String(id) === "3"
      ? { id: "3", status: "active", email: "admin@campuslab.demo" }
      : null;
  },
};

const tenantAuthentication = createTenantAuthentication({
  authRepository: tenantRepository,
  accessSecret: secret,
});
const platformAuthentication = createPlatformAuthentication({
  platformAuthRepository: platformRepository,
  accessSecret: secret,
});

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(cookieParser());
  app.get(
    "/tenant/view",
    tenantAuthentication,
    requirePermissions(permissions.LABORATORIES_VIEW),
    (request, response) => response.json({ auth: request.auth }),
  );
  app.get(
    "/tenant/manage-users",
    tenantAuthentication,
    requirePermissions(permissions.UNIVERSITY_USERS_MANAGE),
    (request, response) => response.json({ auth: request.auth }),
  );
  app.get(
    "/platform/review",
    platformAuthentication,
    requirePermissions(permissions.PLATFORM_UNIVERSITIES_REVIEW),
    (request, response) => response.json({ auth: request.auth }),
  );
  app.use(errorHandler);

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function tenantToken(userId, roles = ["university_admin"]) {
  return createAccessToken(
    { id: userId, universityId: "7", roles },
    { secret, expiresInMinutes: 15 },
  );
}

function platformToken() {
  return createPlatformAccessToken(
    { id: "3" },
    { secret, expiresInMinutes: 15 },
  );
}

test("missing and modified tenant cookies are rejected", async () => {
  const missing = await fetch(`${baseUrl}/tenant/view`);
  const modified = await fetch(`${baseUrl}/tenant/view`, {
    headers: { Cookie: "clt_access=modified.token.value" },
  });

  assert.equal(missing.status, 401);
  assert.equal(modified.status, 401);
});

test("tenant identity comes from the validated session, not request input", async () => {
  const response = await fetch(
    `${baseUrl}/tenant/view?universityId=999&userId=999`,
    { headers: { Cookie: `clt_access=${tenantToken("10")}` } },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.auth.userId, "10");
  assert.equal(body.auth.universityId, "7");
  assert.deepEqual(body.auth.roles, ["observer"]);
});

test("database roles override elevated roles claimed inside the JWT", async () => {
  const response = await fetch(`${baseUrl}/tenant/manage-users`, {
    headers: {
      Cookie: `clt_access=${tenantToken("10", ["university_admin"])}`,
    },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("authorized university administrators pass tenant permission checks", async () => {
  const response = await fetch(`${baseUrl}/tenant/manage-users`, {
    headers: { Cookie: `clt_access=${tenantToken("11")}` },
  });

  assert.equal(response.status, 200);
});

test("suspended universities are rejected on their next protected request", async () => {
  const response = await fetch(`${baseUrl}/tenant/view`, {
    headers: { Cookie: `clt_access=${tenantToken("12")}` },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "ACCOUNT_UNAVAILABLE");
});

test("tenant and platform access tokens cannot cross authentication boundaries", async () => {
  const platformOnTenant = await fetch(`${baseUrl}/tenant/view`, {
    headers: { Cookie: `clt_access=${platformToken()}` },
  });
  const tenantOnPlatform = await fetch(`${baseUrl}/platform/review`, {
    headers: { Cookie: `clt_platform_access=${tenantToken("11")}` },
  });

  assert.equal(platformOnTenant.status, 401);
  assert.equal(tenantOnPlatform.status, 401);
});

test("active platform administrators receive only platform context", async () => {
  const response = await fetch(`${baseUrl}/platform/review`, {
    headers: { Cookie: `clt_platform_access=${platformToken()}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.auth.accountType, "platform_admin");
  assert.equal(body.auth.platformAdminId, "3");
  assert.equal(body.auth.universityId, undefined);
});
