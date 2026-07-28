import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEnvironment } from "../src/config/env.js";

const validEnvironment = {
  NODE_ENV: "test",
  PORT: "3000",
  CLIENT_ORIGIN: "http://localhost:5173",
  DB_HOST: "127.0.0.1",
  DB_PORT: "3306",
  DB_NAME: "campuslab_twin_test",
  DB_USER: "campuslab_test",
  DB_PASSWORD: "test-only",
  DB_CONNECTION_LIMIT: "5",
};

test("environment values are validated and coerced", () => {
  const environment = parseEnvironment(validEnvironment);

  assert.equal(environment.PORT, 3000);
  assert.equal(environment.DB_CONNECTION_LIMIT, 5);
});

test("missing required environment values produce a clear startup error", () => {
  assert.throws(
    () => parseEnvironment({}),
    /Konfigurimi i serverit është i paplotë ose i pavlefshëm/,
  );
});
