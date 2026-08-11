import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { permissions } from "../src/authorization/permissions.js";

let server;
let baseUrl;
const calls = [];
const records = new Map([
  ["7", [{ id: "701", universityId: "7", name: "Laboratori Alfa" }]],
  ["8", [{ id: "801", universityId: "8", name: "Laboratori Beta" }]],
]);

const sessions = {
  alfa: { universityId: "7", userId: "70" },
  beta: { universityId: "8", userId: "80" },
};

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        const sessionId = /clt_test_session=([^;]+)/.exec(
          request.headers.cookie ?? "",
        )?.[1];
        const session = sessions[sessionId];
        if (!session) throw new Error("Sesioni testues mungon.");
        request.auth = {
          accountType: "university",
          ...session,
          roles: ["university_admin"],
          permissions: [
            permissions.LABORATORIES_VIEW,
            permissions.LABORATORIES_CREATE,
          ],
        };
        next();
      },
      laboratoryService: {
        async list(filters, context) {
          calls.push({ operation: "list", filters, context });
          await delay(context.universityId === "7" ? 4 : 1);
          return {
            items: records
              .get(context.universityId)
              .filter((item) =>
                filters.search
                  ? item.name
                      .toLowerCase()
                      .includes(String(filters.search).toLowerCase())
                  : true,
              ),
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async create(input, context) {
          calls.push({ operation: "create", input, context });
          await delay(context.universityId === "7" ? 1 : 4);
          const item = {
            id: `${context.universityId}02`,
            universityId: context.universityId,
            name: input.name,
            code: input.code,
          };
          records.get(context.universityId).push(item);
          return item;
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function tenantRequest(session, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      cookie: `clt_test_session=${session}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
  });
  assert.ok(response.ok);
  return (await response.json()).data;
}

test("two university accounts remain isolated under parallel reads and writes", async () => {
  const [createdAlfa, createdBeta] = await Promise.all([
    tenantRequest("alfa", "/api/laboratories", {
      method: "POST",
      body: JSON.stringify({ name: "Laboratori i Ri Alfa", code: "LAB-01" }),
    }),
    tenantRequest("beta", "/api/laboratories", {
      method: "POST",
      body: JSON.stringify({ name: "Laboratori i Ri Beta", code: "LAB-01" }),
    }),
  ]);

  assert.equal(createdAlfa.laboratory.universityId, "7");
  assert.equal(createdBeta.laboratory.universityId, "8");

  const parallelReads = Array.from({ length: 20 }, (_, index) => {
    const session = index % 2 === 0 ? "alfa" : "beta";
    const search = session === "alfa" ? "Alfa" : "Beta";
    return tenantRequest(
      session,
      `/api/laboratories?page=1&pageSize=20&search=${search}`,
    ).then((data) => ({ session, items: data.laboratories }));
  });
  const results = await Promise.all(parallelReads);

  for (const result of results) {
    const expectedTenant = result.session === "alfa" ? "7" : "8";
    assert.ok(result.items.length > 0);
    assert.ok(
      result.items.every((item) => item.universityId === expectedTenant),
    );
  }
  assert.ok(
    calls.every(
      ({ context }) =>
        (context.universityId === "7" && context.userId === "70") ||
        (context.universityId === "8" && context.userId === "80"),
    ),
  );
});
