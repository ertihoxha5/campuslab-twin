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
  JWT_ACCESS_SECRET: "test-only-secret-with-at-least-32-characters",
  ACCESS_TOKEN_MINUTES: "15",
  REFRESH_TOKEN_DAYS: "7",
};

test("environment values are validated and coerced", () => {
  const environment = parseEnvironment(validEnvironment);

  assert.equal(environment.PORT, 3000);
  assert.equal(environment.DB_CONNECTION_LIMIT, 5);
  assert.equal(environment.ACCESS_TOKEN_MINUTES, 15);
  assert.equal(environment.READING_AGGREGATION_INTERVAL_MINUTES, 60);
  assert.equal(environment.READING_RAW_RETENTION_DAYS, 30);
});

test("missing required environment values produce a clear startup error", () => {
  assert.throws(
    () => parseEnvironment({}),
    /Konfigurimi i serverit është i paplotë ose i pavlefshëm/,
  );
});
