import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createReportRepository } from "../src/modules/reports/repository.js";
import { createReportService } from "../src/modules/reports/service.js";
import { exportReport } from "../src/modules/reports/exporter.js";

test("report repository scopes lists by tenant and laboratory assignments", async () => {
  const calls = [];
  const repository = createReportRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 4, universityId: 7, parameters: "{}" }]];
    },
  });
  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    page: 1,
    pageSize: 20,
    laboratoryId: "15",
    reportType: "energy",
  });
  assert.equal(result.total, 1);
  assert.ok(calls.every(({ sql }) => sql.includes("report.university_id = ?")));
  assert.ok(calls.every(({ sql }) => sql.includes("assignment.user_id = ?")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("7")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("15")));
  assert.ok(
    calls.some(({ sql }) => sql.includes("user.full_name AS generatedByName")),
  );
  assert.ok(calls.every(({ sql }) => !sql.includes("user.first_name")));
  assert.ok(calls.every(({ sql }) => !sql.includes("user.last_name")));
});

test("report service persists immutable generation metadata", async () => {
  let captured;
  const service = createReportService({
    clock: () => new Date("2026-08-09T10:30:00.000Z"),
    repository: {
      async create(input) {
        captured = input;
        return {
          id: 4,
          universityId: 7,
          laboratoryId: 15,
          generatedByUserId: 9,
          title: input.title,
          parameters: JSON.stringify(input.parameters),
        };
      },
    },
  });
  const report = await service.create(
    {
      title: "Raporti mujor i energjisë",
      reportType: "energy",
      laboratoryId: "15",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-09T00:00:00.000Z",
      format: "pdf",
      dataSource: "mixed",
    },
    { universityId: "7", userId: "9", roles: ["lab_manager"] },
  );
  assert.equal(captured.universityId, "7");
  assert.equal(captured.parameters.format, "pdf");
  assert.equal(captured.parameters.dataSource, "mixed");
  assert.equal(captured.parameters.generatedAt, "2026-08-09T10:30:00.000Z");
  assert.equal(report.parameters.periodStart, "2026-08-01T00:00:00.000Z");
});

test("report service rejects inverted periods", async () => {
  const service = createReportService({ repository: { create() {} } });
  await assert.rejects(
    service.create(
      {
        title: "Raport testues",
        reportType: "laboratory",
        periodStart: "2026-08-09T00:00:00.000Z",
        periodEnd: "2026-08-01T00:00:00.000Z",
        format: "csv",
        dataSource: "simulated",
      },
      { universityId: "7", userId: "9", roles: [] },
    ),
    (error) => error.status === 422,
  );
});

test("report download keeps tenant and assignment ownership checks", async () => {
  let captured;
  const service = createReportService({
    repository: {
      async findAccessibleById(context) {
        captured = context;
        return {
          id: 4,
          universityId: 7,
          laboratoryId: 15,
          generatedByUserId: 9,
          universityName: "Universiteti Test",
          laboratoryName: "Laboratori A",
          generatedByName: "Admin Test",
          title: "Raporti testues",
          reportType: "energy",
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
          periodEnd: new Date("2026-08-09T00:00:00.000Z"),
          parameters: JSON.stringify({
            format: "csv",
            dataSource: "mixed",
            generatedAt: "2026-08-09T10:30:00.000Z",
            snapshot: { series: [] },
          }),
        };
      },
    },
  });
  const file = await service.download("4", {
    universityId: "7",
    userId: "9",
    roles: ["technician"],
  });
  assert.equal(captured.universityId, "7");
  assert.equal(captured.restrictToAssignments, true);
  assert.equal(file.filename, "raporti-4.csv");
  assert.match(file.content.toString("utf8"), /Universiteti Test/);
});

test("report exporter creates valid PDF and protects CSV formula cells", async () => {
  const baseReport = {
    id: "4",
    universityName: "Universiteti Test",
    laboratoryName: "Laboratori A",
    generatedByName: "Admin Test",
    title: "Raporti i energjisë",
    reportType: "energy",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-09T00:00:00.000Z"),
  };
  const pdf = await exportReport({
    ...baseReport,
    parameters: {
      format: "pdf",
      dataSource: "physical",
      generatedAt: "2026-08-09T10:30:00.000Z",
      snapshot: { summary: { value: 15, samples: 2 }, series: [] },
    },
  });
  assert.equal(pdf.content.subarray(0, 4).toString(), "%PDF");
  const csv = await exportReport({
    ...baseReport,
    parameters: {
      format: "csv",
      dataSource: "physical",
      generatedAt: "2026-08-09T10:30:00.000Z",
      snapshot: {
        series: [{ bucketStart: "=SUM(A1:A2)", value: 15, samples: 2 }],
      },
    },
  });
  assert.ok(csv.content.toString("utf8").startsWith("\uFEFF"));
  assert.match(csv.content.toString("utf8"), /'=SUM\(A1:A2\)/);
});

let server;
let baseUrl;
let capturedContext;
before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        request.auth = {
          universityId: "7",
          userId: "9",
          roles: ["observer"],
          permissions: request.headers["x-test-permission"]?.split(",") ?? [],
        };
        next();
      },
      reportService: {
        async list(_input, context) {
          capturedContext = context;
          return {
            reports: [],
            pagination: { page: 1, pageSize: 20, total: 0 },
          };
        },
        async create() {
          return { id: "4" };
        },
        async download() {
          return {
            filename: "raporti-4.csv",
            contentType: "text/csv; charset=utf-8",
            content: Buffer.from("test"),
          };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("report endpoints enforce separate view and generate permissions", async () => {
  assert.equal((await fetch(`${baseUrl}/api/reports`)).status, 403);
  const list = await fetch(`${baseUrl}/api/reports`, {
    headers: { "x-test-permission": "reports.view" },
  });
  assert.equal(list.status, 200);
  assert.equal(capturedContext.universityId, "7");
  assert.equal(
    (
      await fetch(`${baseUrl}/api/reports`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-permission": "reports.view",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${baseUrl}/api/reports`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-permission": "reports.generate",
        },
        body: "{}",
      })
    ).status,
    201,
  );
  const download = await fetch(`${baseUrl}/api/reports/4/download`, {
    headers: { "x-test-permission": "reports.view" },
  });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("cache-control"), "private, no-store");
  assert.match(download.headers.get("content-disposition"), /raporti-4\.csv/);
});
