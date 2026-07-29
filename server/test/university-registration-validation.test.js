import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateInstitutionalEmail,
  validateRegistrationInput,
} from "../src/modules/university-registrations/validation.js";

const validRegistration = {
  universityName: "Universiteti i Testimit",
  acronym: "ut",
  institutionType: "public",
  city: "Prishtinë",
  address: "Rruga e Universitetit 1",
  officialWebsite: "https://www.uni-test.edu",
  description: "Universitet demonstrues.",
  representativeName: "Arta Testi",
  representativeEmail: "arta@uni-test.edu",
  representativePhone: "+383 44 000 000",
  password: "Fjalekalim!2026",
  confirmPassword: "Fjalekalim!2026",
  acceptsTerms: "true",
};

test("validates and normalizes a university registration", () => {
  const registration = validateRegistrationInput(validRegistration);

  assert.equal(registration.acronym, "UT");
  assert.equal(registration.representativeEmail, "arta@uni-test.edu");
  assert.equal(registration.acceptsTerms, true);
});

test("rejects public email providers", () => {
  assert.throws(
    () =>
      validateInstitutionalEmail("campuslab@gmail.com", "https://uni-test.edu"),
    (error) =>
      error.code === "PUBLIC_EMAIL_NOT_ALLOWED" && error.status === 422,
  );
});

test("rejects an institutional domain mismatch", () => {
  assert.throws(
    () => validateInstitutionalEmail("arta@tjeter.edu", "https://uni-test.edu"),
    (error) =>
      error.code === "INSTITUTIONAL_DOMAIN_MISMATCH" && error.status === 422,
  );
});

test("accepts valid institutional subdomains", () => {
  assert.doesNotThrow(() =>
    validateInstitutionalEmail(
      "arta@fiek.uni-test.edu",
      "https://www.uni-test.edu",
    ),
  );
});

test("accepts matching reserved domains for test universities", () => {
  const registration = validateRegistrationInput({
    ...validRegistration,
    universityName: "Universiteti Testues",
    acronym: "UTEST",
    officialWebsite: "https://universiteti.test",
    representativeEmail: "admin@universiteti.test",
  });

  assert.equal(registration.representativeEmail, "admin@universiteti.test");
});

test("returns Albanian field errors for invalid input", () => {
  assert.throws(
    () =>
      validateRegistrationInput({
        ...validRegistration,
        password: "dobet",
        confirmPassword: "ndryshe",
        acceptsTerms: "false",
      }),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      error.details.password.length > 0 &&
      error.details.confirmPassword.length > 0 &&
      error.details.acceptsTerms.length > 0,
  );
});
