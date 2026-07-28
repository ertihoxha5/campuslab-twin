import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { createRegistrationService } from "../src/modules/university-registrations/service.js";

const registrationInput = {
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
  password: "Fjalekalim!2026",
  confirmPassword: "Fjalekalim!2026",
  acceptsTerms: true,
};

test("hashes the password and persists only the hash", async () => {
  let persisted;
  const repository = {
    findConflict: async () => null,
    create: async (registration) => {
      persisted = registration;
      return { id: 41 };
    },
  };
  const logoStorage = {
    save: async () => "uploads/registration-requests/test/logo.png",
    remove: async () => {},
  };
  const service = createRegistrationService({
    repository,
    logoStorage,
    passwordRounds: 4,
  });

  const result = await service.register(registrationInput, {
    mimetype: "image/png",
    buffer: Buffer.from("logo"),
  });

  assert.equal(result.id, 41);
  assert.notEqual(persisted.passwordHash, registrationInput.password);
  assert.equal(
    await bcrypt.compare(registrationInput.password, persisted.passwordHash),
    true,
  );
  assert.equal(persisted.password, undefined);
  assert.equal(persisted.confirmPassword, undefined);
});

test("rejects duplicate registration data before hashing or file storage", async () => {
  let logoSaved = false;
  const service = createRegistrationService({
    repository: {
      findConflict: async () => ({ conflict_type: "registration" }),
      create: async () => {
        throw new Error("should not run");
      },
    },
    logoStorage: {
      save: async () => {
        logoSaved = true;
      },
      remove: async () => {},
    },
    passwordRounds: 4,
  });

  await assert.rejects(
    service.register(registrationInput),
    (error) => error.code === "REGISTRATION_CONFLICT" && error.status === 409,
  );
  assert.equal(logoSaved, false);
});
