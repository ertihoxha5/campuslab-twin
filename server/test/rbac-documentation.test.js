import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  permissions,
  rolePermissions,
} from "../src/authorization/permissions.js";

const documentationUrl = new URL("../../docs/rbac.md", import.meta.url);

function section(documentation, start, end) {
  return documentation.split(start)[1]?.split(end)[0] ?? "";
}

function listedPermissions(content) {
  return [...content.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1]);
}

test("RBAC documentation lists every implemented permission exactly once", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  const permissionSection = section(
    documentation,
    "<!-- permission-codes:start -->",
    "<!-- permission-codes:end -->",
  );

  assert.deepEqual(
    new Set(listedPermissions(permissionSection)),
    new Set(Object.values(permissions)),
  );
  assert.equal(
    listedPermissions(permissionSection).length,
    Object.values(permissions).length,
  );
});

test("documented role assignments match the authorization source", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  const rolesSection = section(
    documentation,
    "<!-- role-permissions:start -->",
    "<!-- role-permissions:end -->",
  );

  for (const [role, expectedPermissions] of Object.entries(rolePermissions)) {
    const roleContent = rolesSection.split(`### ${role}`)[1]?.split("### ")[0];
    assert.ok(roleContent, `Dokumentacioni mungon për rolin ${role}`);
    assert.deepEqual(
      new Set(listedPermissions(roleContent)),
      new Set(expectedPermissions),
      role,
    );
  }
});
