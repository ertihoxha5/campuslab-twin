import assert from "node:assert/strict";
import test from "node:test";
import { query } from "../src/database/query.js";

test("query normalizes optional undefined bindings to SQL NULL", async () => {
  let receivedParameters;
  const executor = {
    async execute(_sql, parameters) {
      receivedParameters = parameters;
      return [[{ ok: true }]];
    },
  };

  const rows = await query(executor, "SELECT ?, ?, ?", ["value", undefined, 3]);

  assert.deepEqual(receivedParameters, ["value", null, 3]);
  assert.deepEqual(rows, [{ ok: true }]);
});
