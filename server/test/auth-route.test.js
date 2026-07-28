import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  const authService = {
    async login() {
      return {
        user: { id: "11", fullName: "Arta Krasniqi" },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        refreshExpiresAt: new Date(Date.now() + 60_000),
      };
    },
    async currentUser(token) {
      assert.equal(token, "access-token");
      return { id: "11", fullName: "Arta Krasniqi" };
    },
    async refresh(token) {
      assert.equal(token, "refresh-token");
      return {
        user: { id: "11", fullName: "Arta Krasniqi" },
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        refreshExpiresAt: new Date(Date.now() + 60_000),
      };
    },
    async logout(token) {
      assert.equal(token, "refresh-token");
    },
    async forgotPassword() {},
    async resetPassword() {},
  };

  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    authService,
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

test("login sets HTTP-only access and refresh cookies", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "arta@uni-test.edu",
      password: "Fjalekalim!2026",
    }),
  });
  const body = await response.json();
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.equal(body.data.user.id, "11");
  assert.equal(cookies.length, 2);
  assert.ok(cookies.every((cookie) => cookie.includes("HttpOnly")));
  assert.ok(cookies.every((cookie) => cookie.includes("SameSite=Lax")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_access=")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_refresh=")));
  assert.equal(JSON.stringify(body).includes("access-token"), false);
});

test("current user reads the access cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: "clt_access=access-token" },
  });
  assert.equal(response.status, 200);
});

test("refresh rotates session cookies", async () => {
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { Cookie: "clt_refresh=refresh-token" },
  });
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("clt_access=new-access-token")),
  );
  assert.ok(
    cookies.some((cookie) =>
      cookie.startsWith("clt_refresh=new-refresh-token"),
    ),
  );
});

test("logout invalidates and clears session cookies", async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: "clt_refresh=refresh-token" },
  });
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_access=;")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_refresh=;")));
});

test("forgot password always returns a generic response", async () => {
  const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "panjohur@uni-test.edu" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.match(body.data.message, /Nëse email-i/);
});

test("reset password clears existing session cookies", async () => {
  const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "one-time-reset-token-that-is-long-enough",
      password: "Fjalekalim!2027",
      confirmPassword: "Fjalekalim!2027",
    }),
  });
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_access=;")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("clt_refresh=;")));
});
