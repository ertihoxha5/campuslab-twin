import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

let server;
let baseUrl;
const calls = [];

before(async () => {
  const registrationService = {
    async register(body, file) {
      calls.push({ body, file });
      return { id: 73 };
    },
  };
  server = createApp({
    logging: false,
    rateLimitEnabled: false,
    registrationService,
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("POST /api/public/university-registrations accepts multipart data", async () => {
  const form = new FormData();
  form.set("universityName", "Universiteti i Testimit");
  form.set("representativeEmail", "arta@uni-test.edu");
  form.set(
    "logo",
    new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: "image/png",
    }),
    "logo.png",
  );

  const response = await fetch(
    `${baseUrl}/api/public/university-registrations`,
    { method: "POST", body: form },
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.id, 73);
  assert.equal(body.data.status, "pending");
  assert.equal(calls[0].body.universityName, "Universiteti i Testimit");
  assert.equal(calls[0].file.mimetype, "image/png");
});

test("registration rejects unsupported logo types in Albanian", async () => {
  const form = new FormData();
  form.set(
    "logo",
    new Blob([Buffer.from("text")], { type: "text/plain" }),
    "logo.txt",
  );

  const response = await fetch(
    `${baseUrl}/api/public/university-registrations`,
    { method: "POST", body: form },
  );
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "INVALID_LOGO_TYPE");
  assert.equal(
    body.error.message,
    "Logoja duhet të jetë skedar JPG, PNG ose WebP.",
  );
});
