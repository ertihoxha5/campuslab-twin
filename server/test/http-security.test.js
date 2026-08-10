import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

const clientOrigin = "https://campuslab.test";
let server;
let baseUrl;
let recoveryCalls = 0;

before(async () => {
  server = createServer(
    createApp({
      clientOrigin,
      logging: false,
      rateLimitEnabled: false,
      secureCookies: true,
      authService: {
        async login() {
          return {
            user: { id: "9" },
            accessToken: "access-token",
            refreshToken: "refresh-token",
            refreshExpiresAt: new Date(Date.now() + 60_000),
          };
        },
        async forgotPassword() {
          recoveryCalls += 1;
        },
        async resetPassword() {},
        async logout() {},
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("HTTP security: Helmet headers are present on API responses", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.ok(response.headers.get("content-security-policy"));
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("HTTP security: CORS allows only the configured credentialed origin", async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, {
    method: "OPTIONS",
    headers: {
      Origin: clientOrigin,
      "Access-Control-Request-Method": "GET",
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    clientOrigin,
  );
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
  assert.match(allowed.headers.get("access-control-allow-methods"), /GET/);

  const attacker = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: "https://attacker.example" },
  });
  assert.notEqual(
    attacker.headers.get("access-control-allow-origin"),
    "https://attacker.example",
  );
});

test("HTTP security: oversized JSON is rejected without leaking internals", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(1024 * 1024 + 1) }),
  });
  const body = await response.json();
  assert.equal(response.status, 413);
  assert.equal(body.success, false);
  assert.equal(JSON.stringify(body).includes("stack"), false);
  assert.equal(JSON.stringify(body).includes("node_modules"), false);
});

test("HTTP security: malformed JSON receives the shared validation response", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"email":',
  });
  const body = await response.json();
  assert.equal(response.status, 422);
  assert.equal(body.success, false);
  assert.ok(body.error.details.body.length > 0);
});

test("HTTP security: authentication cookies use secure browser attributes", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin@campuslab.test",
      password: "Fjalekalim!2026",
    }),
  });
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);
  }
});

test("HTTP security: password recovery is rate limited", async () => {
  const statuses = [];
  for (let index = 0; index < 6; index += 1) {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "unknown@campuslab.test" }),
    });
    statuses.push(response.status);
  }
  assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.equal(statuses[5], 429);
  assert.equal(recoveryCalls, 5);
});
