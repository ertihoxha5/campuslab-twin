import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { createLaboratoryAccessRepository } from "../src/authorization/laboratory-access-repository.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import {
  createLaboratoryAccess,
  requiresLaboratoryAssignment,
} from "../src/middleware/require-laboratory-access.js";

const laboratories = new Map([
  ["7:20", { id: "20" }],
  ["8:30", { id: "30" }],
]);
const assignments = new Set(["7:50:20"]);

const accessRepository = {
  async findAccessibleLaboratory({
    universityId,
    userId,
    laboratoryId,
    requiresAssignment,
  }) {
    const laboratory = laboratories.get(`${universityId}:${laboratoryId}`);
    if (!laboratory) return null;
    if (
      requiresAssignment &&
      !assignments.has(`${universityId}:${userId}:${laboratoryId}`)
    ) {
      return null;
    }
    return laboratory;
  },
};

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use((request, _response, next) => {
    request.auth = {
      accountType: "university",
      userId: request.get("x-test-user"),
      universityId: request.get("x-test-university"),
      roles: [request.get("x-test-role")],
      permissions: [],
    };
    next();
  });
  app.get(
    "/laboratories/:laboratoryId",
    createLaboratoryAccess({ laboratoryAccessRepository: accessRepository }),
    (request, response) => response.json(request.laboratoryAccess),
  );
  app.use(errorHandler);

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function headers({ user = "50", university = "7", role = "technician" } = {}) {
  return {
    "x-test-user": user,
    "x-test-university": university,
    "x-test-role": role,
  };
}

test("university administrators can access any laboratory in their tenant", async () => {
  const response = await fetch(`${baseUrl}/laboratories/20`, {
    headers: headers({ role: "university_admin" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.laboratoryId, "20");
  assert.equal(body.assignmentRequired, false);
});

test("restricted roles can access an assigned laboratory", async () => {
  const response = await fetch(`${baseUrl}/laboratories/20`, {
    headers: headers(),
  });

  assert.equal(response.status, 200);
});

test("unassigned and cross-tenant laboratories both return 404", async () => {
  const unassigned = await fetch(`${baseUrl}/laboratories/20`, {
    headers: headers({ user: "51" }),
  });
  const crossTenant = await fetch(`${baseUrl}/laboratories/30`, {
    headers: headers({ university: "7", role: "university_admin" }),
  });

  assert.equal(unassigned.status, 404);
  assert.equal(crossTenant.status, 404);
});

test("every non-admin university role requires laboratory assignment", () => {
  for (const role of [
    "lab_manager",
    "technician",
    "academic_staff",
    "observer",
  ]) {
    assert.equal(
      requiresLaboratoryAssignment({ roles: [role] }),
      true,
      `${role} duhet të kufizohet sipas laboratorit`,
    );
  }
});

test("laboratory repository scopes assignment queries by university and user", async () => {
  const calls = [];
  const repository = createLaboratoryAccessRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 20 }]];
    },
  });

  await repository.findAccessibleLaboratory({
    universityId: "7",
    userId: "50",
    laboratoryId: "20",
    requiresAssignment: true,
  });

  assert.match(
    calls[0].sql,
    /assignment\.university_id = laboratory\.university_id/,
  );
  assert.match(calls[0].sql, /laboratory\.university_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "20", "50"]);
});
