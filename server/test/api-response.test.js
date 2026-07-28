import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forbiddenFailure,
  serverFailure,
  validationFailure,
} from "../src/utils/api-response.js";

function createResponseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("validation failures use the shared response contract", () => {
  const response = createResponseRecorder();

  validationFailure(response, { email: ["Email-i është i pavlefshëm."] });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.deepEqual(response.body.error.details, {
    email: ["Email-i është i pavlefshëm."],
  });
});

test("forbidden failures use the shared response contract", () => {
  const response = createResponseRecorder();

  forbiddenFailure(response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
  assert.equal(
    response.body.error.message,
    "Nuk keni leje për të kryer këtë veprim.",
  );
});

test("server failures do not expose internal details", () => {
  const response = createResponseRecorder();

  serverFailure(response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: "Ndodhi një gabim në server. Ju lutemi provoni përsëri.",
    },
  });
});
