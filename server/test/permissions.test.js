import assert from "node:assert/strict";
import { test } from "node:test";
import {
  permissions,
  permissionsForRoles,
} from "../src/authorization/permissions.js";

test("university administrator receives full tenant management permissions", () => {
  const granted = permissionsForRoles(["university_admin"]);

  assert.ok(granted.includes(permissions.UNIVERSITY_USERS_MANAGE));
  assert.ok(granted.includes(permissions.LABORATORIES_CREATE));
  assert.ok(granted.includes(permissions.ASSETS_MANAGE));
  assert.ok(granted.includes(permissions.REPORTS_GENERATE));
  assert.equal(
    granted.includes(permissions.PLATFORM_UNIVERSITIES_REVIEW),
    false,
  );
});

test("observer permissions remain read-only", () => {
  const granted = permissionsForRoles(["observer"]);

  assert.deepEqual(
    granted,
    [
      permissions.LABORATORIES_VIEW,
      permissions.MONITORING_VIEW,
      permissions.REPORTS_VIEW,
    ].sort(),
  );
});

test("multiple roles combine permissions without duplicates", () => {
  const granted = permissionsForRoles(["observer", "academic_staff"]);

  assert.equal(new Set(granted).size, granted.length);
  assert.ok(granted.includes(permissions.ALERTS_REPORT));
  assert.ok(granted.includes(permissions.SIMULATIONS_RUN));
  assert.equal(granted.includes(permissions.ASSETS_MANAGE), false);
});

test("platform administrator receives no tenant management permission", () => {
  const granted = permissionsForRoles(["platform_admin"]);

  assert.ok(granted.includes(permissions.PLATFORM_UNIVERSITIES_REVIEW));
  assert.equal(granted.includes(permissions.UNIVERSITY_USERS_MANAGE), false);
  assert.equal(granted.includes(permissions.LABORATORIES_MANAGE), false);
});
