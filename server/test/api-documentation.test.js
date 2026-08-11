import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const documentationUrl = new URL("../../docs/api.md", import.meta.url);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requiredEndpoints = [
  "GET /api/health",
  "POST /api/public/university-registrations",
  "POST /api/auth/login",
  "POST /api/platform/auth/login",
  "PATCH /api/platform/registration-requests/:requestId/decision",
  "GET /api/dashboard/summary",
  "POST /api/laboratories",
  "POST /api/laboratories/:laboratoryId/model",
  "POST /api/laboratories/:laboratoryId/zones",
  "POST /api/equipment",
  "POST /api/sensors",
  "POST /api/sensors/:sensorId/calibrations",
  "PATCH /api/alerts/:alertId/status",
  "GET /api/analytics/history",
  "POST /api/simulator/laboratories/:laboratoryId/start",
  "POST /api/maintenance",
  "POST /api/maintenance/:taskId/evidence",
  "POST /api/reports",
  "POST /api/university/users",
  "PUT /api/university/settings",
  "PUT /api/account/password",
];

test("REST documentation covers every primary thesis workflow endpoint", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  for (const endpoint of requiredEndpoints) {
    const [method, path] = endpoint.split(" ");
    assert.match(
      documentation,
      new RegExp(
        `\\|\\s*${method}\\s*\\|\\s*` + "`" + escapeRegExp(path) + "`",
      ),
      endpoint,
    );
  }
});
