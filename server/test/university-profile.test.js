import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createUniversityProfileRepository } from "../src/modules/university-profile/repository.js";
import { createUniversityProfileService } from "../src/modules/university-profile/service.js";
import { createUniversityLogoService } from "../src/modules/university-profile/logo-service.js";

const input = {
  name: "Universiteti Test",
  acronym: "ut",
  institutionType: "public",
  city: "Prishtinë",
  address: "Rruga e Universitetit 1",
  officialWebsite: "https://universiteti.test",
  description: "Universitet testues.",
  representativeName: "Ada Test",
  representativeEmail: "ADA@UNIVERSITETI.TEST",
};

test("university profile service derives identity and normalizes editable fields", async () => {
  let captured;
  const service = createUniversityProfileService({
    repository: {
      async update(value) {
        captured = value;
        return { id: 7, ...value, logoFileId: 22 };
      },
    },
  });
  const profile = await service.update(
    { ...input, universityId: "999" },
    { universityId: "7", userId: "9", ipAddress: "127.0.0.1" },
  );
  assert.equal(captured.universityId, "7");
  assert.equal(captured.userId, "9");
  assert.equal(captured.acronym, "UT");
  assert.equal(captured.representativeEmail, "ada@universiteti.test");
  assert.equal(profile.logoFileId, "22");
});

test("profile update and audit commit atomically for the authenticated university", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {},
    async commit() {
      calls.push({ sql: "COMMIT", parameters: [] });
    },
    async rollback() {},
    release() {},
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT id FROM universities")) return [[{ id: 7 }]];
      if (sql.includes("SELECT id, name, acronym"))
        return [[{ id: 7, name: input.name, logoFileId: null }]];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createUniversityProfileRepository({
    async getConnection() {
      return connection;
    },
  });
  const profile = await repository.update({
    ...input,
    universityId: "7",
    userId: "9",
    ipAddress: null,
  });
  assert.equal(profile.id, 7);
  assert.ok(calls.some(({ sql }) => sql.includes("UPDATE universities")));
  assert.ok(
    calls.some(({ sql }) => sql.includes("'university.profile.updated'")),
  );
  assert.ok(calls.some(({ sql }) => sql === "COMMIT"));
  assert.ok(
    calls.filter(({ parameters }) => parameters.includes("7")).length >= 2,
  );
});

test("logo upload validates image content and persists tenant metadata", async () => {
  let saved;
  let attached;
  const service = createUniversityLogoService({
    storage: {
      async save(input) {
        saved = input;
        return {
          storedName: "logo.png",
          relativePath: "uploads/universities/7/branding/logo.png",
          checksumSha256: "abc",
        };
      },
      async remove() {},
    },
    repository: {
      async attachLogo(input) {
        attached = input;
        return { id: "22", mimeType: input.file.mimeType };
      },
    },
  });
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
  const logo = await service.upload(
    {
      buffer: png,
      mimetype: "image/png",
      originalname: "logo.png",
      size: png.length,
    },
    { universityId: "7", userId: "9", ipAddress: null },
  );
  assert.equal(saved.universityId, "7");
  assert.equal(attached.universityId, "7");
  assert.equal(attached.userId, "9");
  assert.equal(logo.id, "22");
  await assert.rejects(
    service.upload(
      {
        buffer: Buffer.from("fake"),
        mimetype: "image/png",
        originalname: "fake.png",
        size: 4,
      },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422,
  );
});

let server;
let baseUrl;
let captured;
before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        request.auth = {
          universityId: "7",
          userId: "9",
          roles: ["university_admin"],
          permissions: request.headers["x-test-profile"]
            ? ["university.profile.manage"]
            : [],
        };
        next();
      },
      universityProfileService: {
        async get(context) {
          captured = context;
          return { id: "7" };
        },
        async update(_input, context) {
          captured = context;
          return { id: "7" };
        },
      },
      universityLogoService: {
        async upload(file, context) {
          captured = { context, file };
          return { id: "22" };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("profile endpoints require profile permission and server tenant context", async () => {
  assert.equal((await fetch(`${baseUrl}/api/university/profile`)).status, 403);
  const get = await fetch(`${baseUrl}/api/university/profile`, {
    headers: { "x-test-profile": "true" },
  });
  assert.equal(get.status, 200);
  assert.equal(captured.universityId, "7");
  const update = await fetch(`${baseUrl}/api/university/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-test-profile": "true" },
    body: "{}",
  });
  assert.equal(update.status, 200);
  assert.equal(captured.userId, "9");
  const form = new FormData();
  form.set(
    "logo",
    new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }),
    "logo.png",
  );
  const logo = await fetch(`${baseUrl}/api/university/profile/logo`, {
    method: "POST",
    headers: { "x-test-profile": "true" },
    body: form,
  });
  assert.equal(logo.status, 201);
  assert.equal(captured.context.universityId, "7");
  assert.equal(captured.file.originalname, "logo.png");
});
