import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createAnalyticsRepository } from "../src/modules/analytics/repository.js";
import {
  createAnalyticsService,
  estimateSeriesPoints,
} from "../src/modules/analytics/service.js";

test("historical sensor analytics apply tenant, assignment, asset, metric, and date filters", async () => {
  const calls = [];
  const repository = createAnalyticsRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("GROUP BY bucketStart"))
        return [
          [
            {
              bucketStart: "2026-08-01",
              value: "22.5",
              minimum: "20",
              maximum: "25",
              samples: 4,
            },
          ],
        ];
      if (sql.includes("GROUP BY source"))
        return [[{ source: "simulated", samples: 4 }]];
      return [[{ value: "22.5", minimum: "20", maximum: "25", samples: 4 }]];
    },
  });
  const result = await repository.history({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    metric: "temperature",
    interval: "daily",
    laboratoryId: "15",
    assetId: "31",
    startAt: new Date("2026-08-01T00:00:00Z"),
    endAt: new Date("2026-08-08T00:00:00Z"),
  });
  assert.equal(result.series.length, 1);
  assert.ok(
    calls.every(({ sql }) => sql.includes("reading.university_id = ?")),
  );
  assert.ok(calls.every(({ sql }) => sql.includes("assignment.user_id = ?")));
  assert.ok(calls.every(({ parameters }) => parameters[0] === "7"));
  assert.ok(
    calls.every(({ parameters }) => parameters.includes("temperature")),
  );
  assert.ok(
    calls.every(
      ({ parameters }) =>
        parameters.includes("15") && parameters.includes("31"),
    ),
  );
});

test("analytics service validates range and normalizes stored numeric results", async () => {
  const calls = [];
  const service = createAnalyticsService({
    repository: {
      async history(input) {
        calls.push(input);
        return {
          summary: { value: "8.5", samples: "3" },
          series: [{ bucketStart: "2026-08-01", value: "8.5", samples: "3" }],
          provenance: [{ source: "physical", samples: "3" }],
        };
      },
    },
  });
  const result = await service.history(
    {
      metric: "power",
      interval: "daily",
      laboratoryId: "15",
      equipmentId: "999",
      assetId: "21",
      startAt: "2026-08-01T00:00:00.000Z",
      endAt: "2026-08-08T00:00:00.000Z",
    },
    { universityId: "7", userId: "9", roles: ["lab_manager"] },
  );
  assert.equal(result.summary.value, 8.5);
  assert.equal(result.series[0].samples, 3);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].assetId, "21");
  await assert.rejects(
    service.history(
      {
        metric: "power",
        startAt: "2025-01-01T00:00:00.000Z",
        endAt: "2026-08-08T00:00:00.000Z",
      },
      { universityId: "7", userId: "9", roles: [] },
    ),
    (error) => error.status === 422,
  );
});

test("analytics limits chart payloads and accepts a coarser interval", async () => {
  const calls = [];
  const service = createAnalyticsService({
    repository: {
      async history(input) {
        calls.push(input);
        return { summary: {}, series: [], provenance: [] };
      },
    },
    maximumSeriesPoints: 400,
  });
  const context = { universityId: "7", userId: "9", roles: [] };
  const range = {
    metric: "temperature",
    startAt: "2026-07-01T00:00:00.000Z",
    endAt: "2026-08-01T00:00:00.000Z",
  };

  await assert.rejects(
    service.history({ ...range, interval: "hourly" }, context),
    (error) =>
      error.status === 422 && error.message.includes("kufirin prej 400 pikash"),
  );
  assert.equal(calls.length, 0);

  await service.history({ ...range, interval: "daily" }, context);
  assert.equal(calls.length, 1);
  assert.equal(
    estimateSeriesPoints({
      startAt: new Date(range.startAt),
      endAt: new Date(range.endAt),
      interval: "daily",
    }),
    32,
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
          roles: ["observer"],
          permissions: request.headers["x-test-report"] ? ["reports.view"] : [],
        };
        next();
      },
      analyticsService: {
        async history(input, context) {
          captured = { input, context };
          return { summary: {}, series: [], provenance: [] };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("analytics endpoint requires report permission and derives tenant context", async () => {
  const path =
    "/api/analytics/history?metric=power&startAt=2026-08-01T00%3A00%3A00.000Z&endAt=2026-08-08T00%3A00%3A00.000Z";
  assert.equal((await fetch(`${baseUrl}${path}`)).status, 403);
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "x-test-report": "true" },
  });
  assert.equal(response.status, 200);
  assert.equal(captured.context.universityId, "7");
  assert.equal(captured.input.metric, "power");
});
