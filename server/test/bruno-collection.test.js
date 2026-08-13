import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const collectionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../bruno",
);

async function collectBrunoFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory()
        ? collectBrunoFiles(target)
        : Promise.resolve(entry.name.endsWith(".bru") ? [target] : []);
    }),
  );
  return nested.flat();
}

test("Bruno collection documents the primary API and every demo role", async () => {
  const files = await collectBrunoFiles(collectionRoot);
  const content = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");

  assert.ok(files.length >= 35, "Collection-i duhet të ketë mbulim të gjerë.");

  for (const endpoint of [
    "/api/health",
    "/api/auth/login",
    "/api/dashboard/summary",
    "/api/laboratories",
    "/api/equipment",
    "/api/sensors",
    "/api/alerts",
    "/api/maintenance",
    "/api/energy/overview",
    "/api/analytics/history",
    "/api/reports",
    "/api/platform/auth/login",
    "/api/platform/registration-requests",
  ]) {
    assert.match(content, new RegExp(endpoint.replaceAll("/", "\\/"), "u"));
  }

  for (const roleVariable of [
    "tenantAdminEmail",
    "platformAdminEmail",
    "managerEmail",
    "technicianEmail",
    "academicEmail",
    "observerEmail",
  ]) {
    assert.match(content, new RegExp(`\\{\\{${roleVariable}\\}\\}`, "u"));
  }

  assert.match(content, /Cross-tenant laboratory returns 404/u);
  assert.match(content, /expect\(res\.getStatus\(\)\)\.to\.equal\(403\)/u);
  assert.doesNotMatch(content, /Bearer\s+[A-Za-z0-9._-]{20,}/u);
});
