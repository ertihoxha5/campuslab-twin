import assert from "node:assert/strict";
import { test } from "node:test";
import { createRegistrationRepository } from "../src/modules/university-registrations/repository.js";

test("registration creation and its platform audit use one transaction", async () => {
  const statements = [];
  let committed = false;
  const connection = {
    beginTransaction: async () => {},
    execute: async (sql, parameters) => {
      statements.push({ sql, parameters });
      return [{ insertId: 91 }];
    },
    commit: async () => {
      committed = true;
    },
    rollback: async () => {},
    release: () => {},
  };
  const repository = createRegistrationRepository({
    getConnection: async () => connection,
  });

  const result = await repository.create(
    {
      universityName: "Universiteti i Testimit",
      acronym: "UT",
      institutionType: "public",
      city: "Prishtinë",
      address: "Rruga e Universitetit 1",
      officialWebsite: "https://uni-test.edu",
      description: "",
      representativeName: "Arta Testi",
      representativeEmail: "arta@uni-test.edu",
      representativePhone: "",
      passwordHash: "$2b$12$hash",
      logoPath: null,
    },
    { ipAddress: "127.0.0.1" },
  );

  assert.equal(result.id, 91);
  assert.equal(committed, true);
  assert.equal(statements.length, 2);
  assert.match(
    statements[0].sql,
    /INSERT INTO university_registration_requests/,
  );
  assert.match(statements[1].sql, /INSERT INTO platform_activity_logs/);
  assert.equal(statements[1].parameters.at(-1), "127.0.0.1");
});
