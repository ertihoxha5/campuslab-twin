import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  const platformAuthService = {
    async login() {
      return {
        administrator: { id: "3", accountType: "platform_admin" },
        accessToken: "platform-access",
        accessMaxAge: 60_000,
        refreshToken: "platform-refresh",
        refreshExpiresAt: new Date(Date.now() + 60_000),
      };
    },
    async currentAdministrator(token) {
      assert.equal(token, "platform-access");
      return { id: "3", accountType: "platform_admin" };
    },
    async refresh() {
      return {
        administrator: { id: "3", accountType: "platform_admin" },
        accessToken: "platform-access-next",
        accessMaxAge: 60_000,
        refreshToken: "platform-refresh-next",
        refreshExpiresAt: new Date(Date.now() + 60_000),
      };
    },
    async logout(token) {
      assert.equal(token, "platform-refresh");
    },
  };
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    platformAuthService,
    secureCookies: false,
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("platform login uses separate HTTP-only cookies", async () => {
  const response = await fetch(`${baseUrl}/api/platform/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@campuslab.demo",
      password: "CampusLab!2026",
    }),
  });
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.ok(cookies.every((cookie) => cookie.includes("HttpOnly")));
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("clt_platform_access=")),
  );
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("clt_platform_refresh=")),
  );
});

test("platform current administrator reads only its access cookie", async () => {
  const response = await fetch(`${baseUrl}/api/platform/auth/me`, {
    headers: { Cookie: "clt_platform_access=platform-access" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.administrator.accountType, "platform_admin");
});

test("platform session restore stays successful without a session", async () => {
  const response = await fetch(`${baseUrl}/api/platform/auth/session`, {
    method: "POST",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.administrator, null);
});

test("platform session restore rotates its isolated refresh cookie", async () => {
  const response = await fetch(`${baseUrl}/api/platform/auth/session`, {
    method: "POST",
    headers: { Cookie: "clt_platform_refresh=platform-refresh-token" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.administrator.id, "3");
  assert.ok(
    response.headers
      .getSetCookie()
      .some((cookie) =>
        cookie.startsWith("clt_platform_access=platform-access-next"),
      ),
  );
});

test("platform logout clears isolated cookies", async () => {
  const response = await fetch(`${baseUrl}/api/platform/auth/logout`, {
    method: "POST",
    headers: { Cookie: "clt_platform_refresh=platform-refresh" },
  });
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("clt_platform_access=;")),
  );
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("clt_platform_refresh=;")),
  );
});
