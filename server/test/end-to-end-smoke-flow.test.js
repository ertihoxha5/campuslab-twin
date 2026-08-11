import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import {
  permissions,
  permissionsForRoles,
} from "../src/authorization/permissions.js";

let server;
let baseUrl;
const steps = [];
const state = {
  registration: null,
  laboratory: null,
  equipment: null,
  sensor: null,
  alert: null,
  maintenance: null,
  runs: [],
  report: null,
};

const future = () => new Date(Date.now() + 60 * 60 * 1000);
const tenantAuth = {
  accountType: "university",
  universityId: "12",
  userId: "30",
  roles: ["university_admin"],
  permissions: permissionsForRoles(["university_admin"]),
};

before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      registrationService: {
        async register(input) {
          steps.push("registration");
          state.registration = { id: "7", status: "pending", ...input };
          return state.registration;
        },
      },
      platformAuthService: {
        async login() {
          steps.push("platform_login");
          return {
            accessToken: "platform-access",
            refreshToken: "platform-refresh",
            accessMaxAge: 60_000,
            refreshExpiresAt: future(),
            administrator: { id: "3", roles: ["platform_admin"] },
          };
        },
      },
      platformAuthentication(request, _response, next) {
        assert.match(request.headers.cookie ?? "", /clt_platform_access=/);
        request.auth = {
          platformAdminId: "3",
          roles: ["platform_admin"],
          permissions: [permissions.PLATFORM_UNIVERSITIES_REVIEW],
        };
        next();
      },
      platformRegistrationService: {
        async review(id, decision, context) {
          steps.push("approval");
          assert.equal(id, state.registration.id);
          assert.equal(decision.decision, "approved");
          assert.equal(context.platformAdminId, "3");
          state.registration.status = "approved";
          return { status: "approved", universityId: "12", userId: "30" };
        },
      },
      authService: {
        async login() {
          steps.push("university_login");
          assert.equal(state.registration.status, "approved");
          return {
            accessToken: "tenant-access",
            refreshToken: "tenant-refresh",
            refreshExpiresAt: future(),
            user: { id: "30", universityId: "12", roles: tenantAuth.roles },
          };
        },
      },
      tenantAuthentication(request, _response, next) {
        assert.match(request.headers.cookie ?? "", /clt_access=/);
        request.auth = tenantAuth;
        next();
      },
      laboratoryAccessRepository: {
        async findAccessibleLaboratory({ laboratoryId, universityId }) {
          if (
            laboratoryId === state.laboratory?.id &&
            universityId === tenantAuth.universityId
          ) {
            return state.laboratory;
          }
          return null;
        },
      },
      laboratoryService: {
        async create(input, context) {
          steps.push("laboratory");
          assert.equal(context.universityId, "12");
          state.laboratory = {
            id: "15",
            ...input,
            modelFileId: "91",
            modelMimeType: "model/gltf-binary",
          };
          return state.laboratory;
        },
        async detail(id, context) {
          steps.push("digital_twin");
          assert.equal(id, state.laboratory.id);
          assert.equal(context.universityId, "12");
          return state.laboratory;
        },
      },
      equipmentService: {
        async create(input, context) {
          steps.push("equipment");
          assert.equal(context.universityId, "12");
          state.equipment = { id: "21", ...input };
          return state.equipment;
        },
      },
      sensorService: {
        async create(input, context) {
          steps.push("sensor");
          assert.equal(context.universityId, "12");
          state.sensor = { id: "31", ...input };
          return state.sensor;
        },
      },
      simulatorService: {
        async start(laboratoryId, input, context) {
          const scenario = input.scenarioId ?? null;
          steps.push(scenario ? "scenario" : "monitoring");
          assert.equal(laboratoryId, state.laboratory.id);
          assert.equal(context.universityId, "12");
          const run = {
            id: String(50 + state.runs.length),
            laboratoryId,
            scenarioId: scenario,
            status: "running",
          };
          state.runs.push(run);
          if (!scenario) {
            state.alert = {
              id: "71",
              laboratoryId,
              sensorId: state.sensor.id,
              status: "new",
              title: "Temperaturë kritike",
            };
          }
          return run;
        },
        async stop() {
          state.runs.at(-1).status = "stopped";
          return state.runs.at(-1);
        },
      },
      alertService: {
        async list(_filters, context) {
          assert.equal(context.universityId, "12");
          return {
            items: state.alert ? [state.alert] : [],
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async transition(id, input, context) {
          steps.push("alert_resolved");
          assert.equal(id, state.alert.id);
          assert.equal(context.universityId, "12");
          state.alert = { ...state.alert, status: input.status };
          return state.alert;
        },
      },
      maintenanceService: {
        async create(input, context) {
          steps.push("maintenance");
          assert.equal(context.universityId, "12");
          state.maintenance = { id: "81", status: "planned", ...input };
          return state.maintenance;
        },
      },
      reportService: {
        async create(input, context) {
          steps.push("report");
          assert.equal(context.universityId, "12");
          state.report = { id: "101", status: "generated", ...input };
          return state.report;
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function jsonRequest(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  assert.equal(payload.success, true, `${method} ${path}`);
  return { response, payload };
}

test("CLT-17 end-to-end thesis smoke flow completes all required stages", async () => {
  const registration = new FormData();
  registration.set("universityName", "Universiteti Testues");
  registration.set("representativeEmail", "admin@universiteti.test");
  let response = await fetch(`${baseUrl}/api/public/university-registrations`, {
    method: "POST",
    body: registration,
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.status, "pending");

  const platformLogin = await jsonRequest("/api/platform/auth/login", {
    method: "POST",
    body: { email: "admin@campuslab.test", password: "Test123!" },
  });
  const platformCookie = platformLogin.response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
  const approval = await jsonRequest(
    "/api/platform/registration-requests/7/decision",
    {
      method: "PATCH",
      cookie: platformCookie,
      body: { decision: "approved" },
    },
  );
  assert.equal(approval.payload.data.result.status, "approved");

  const tenantLogin = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { email: "admin@universiteti.test", password: "Test123!" },
  });
  const tenantCookie = tenantLogin.response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
  const tenantRequest = (path, options = {}) =>
    jsonRequest(path, { ...options, cookie: tenantCookie });

  assert.equal(
    (
      await tenantRequest("/api/laboratories", {
        method: "POST",
        body: { name: "Laboratori i Automatizimit", code: "AUT-01" },
      })
    ).response.status,
    201,
  );
  await tenantRequest("/api/equipment", {
    method: "POST",
    body: { laboratoryId: "15", name: "PLC Siemens", code: "PLC-01" },
  });
  await tenantRequest("/api/sensors", {
    method: "POST",
    body: {
      laboratoryId: "15",
      equipmentId: "21",
      name: "Sensori i temperaturës",
      sensorType: "temperature",
    },
  });

  await tenantRequest("/api/simulator/laboratories/15/start", {
    method: "POST",
    body: {},
  });
  const alerts = await tenantRequest("/api/alerts?laboratoryId=15");
  assert.equal(alerts.payload.data.alerts[0].status, "new");
  const resolved = await tenantRequest("/api/alerts/71/status", {
    method: "PATCH",
    body: { status: "resolved", note: "U verifikua gjatë smoke test-it." },
  });
  assert.equal(resolved.payload.data.alert.status, "resolved");

  const laboratory = await tenantRequest("/api/laboratories/15");
  assert.equal(laboratory.payload.data.laboratory.modelFileId, "91");

  await tenantRequest("/api/maintenance", {
    method: "POST",
    body: {
      laboratoryId: "15",
      equipmentId: "21",
      title: "Kontrolli preventiv",
    },
  });
  await tenantRequest("/api/simulator/laboratories/15/stop", {
    method: "POST",
    body: {},
  });
  await tenantRequest("/api/simulator/laboratories/15/start", {
    method: "POST",
    body: { scenarioId: "4" },
  });
  const report = await tenantRequest("/api/reports", {
    method: "POST",
    body: { laboratoryId: "15", type: "operational", format: "pdf" },
  });
  assert.equal(report.payload.data.report.status, "generated");

  assert.deepEqual(steps, [
    "registration",
    "platform_login",
    "approval",
    "university_login",
    "laboratory",
    "equipment",
    "sensor",
    "monitoring",
    "alert_resolved",
    "digital_twin",
    "maintenance",
    "scenario",
    "report",
  ]);
});
