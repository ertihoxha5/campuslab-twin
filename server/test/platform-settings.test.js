import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";
import { createPlatformSettingsService } from "../src/modules/platform-settings/service.js";
import { validateInstitutionalEmail } from "../src/modules/university-registrations/validation.js";

test("institutional email exceptions bypass only the configured domain pair", () => {
  const policy = {
    exceptions: [
      {
        emailDomain: "partner.edu",
        websiteDomain: "university.al",
      },
    ],
  };
  assert.doesNotThrow(() =>
    validateInstitutionalEmail(
      "admin@partner.edu",
      "https://university.al",
      policy,
    ),
  );
  assert.throws(
    () =>
      validateInstitutionalEmail(
        "admin@partner.edu",
        "https://other.al",
        policy,
      ),
    { code: "INSTITUTIONAL_DOMAIN_MISMATCH" },
  );
});

test("settings service validates domain exceptions", async () => {
  const service = createPlatformSettingsService({
    repository: {
      async addException(value) {
        return value;
      },
    },
  });
  await assert.rejects(
    service.addException(
      { emailDomain: "not a domain", websiteDomain: "", reason: "Test" },
      {},
    ),
    { code: "VALIDATION_ERROR" },
  );
});

let server;
let baseUrl;
let settings = {
  registrationsOpen: true,
  requireWebsiteDomainMatch: true,
  allowPublicEmailProviders: false,
};

before(async () => {
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    platformAuthentication(request, _response, next) {
      request.auth = {
        platformAdminId: 1,
        permissions:
          request.get("x-test-authorized") === "true"
            ? [permissions.PLATFORM_SETTINGS_MANAGE]
            : [],
      };
      next();
    },
    platformSettingsService: {
      async get() {
        return { settings, exceptions: [] };
      },
      async update(value) {
        settings = value;
        return settings;
      },
    },
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("platform settings routes require their dedicated permission", async () => {
  const forbidden = await fetch(`${baseUrl}/api/platform/settings`);
  const allowed = await fetch(`${baseUrl}/api/platform/settings`, {
    headers: { "x-test-authorized": "true" },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
});
