import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import { io as createClient } from "socket.io-client";
import { createAccessToken } from "../src/modules/auth/tokens.js";
import {
  createRealtimeServer,
  laboratoryRoom,
  universityRoom,
} from "../src/realtime/create-realtime-server.js";

const secret = "realtime-test-secret-that-is-at-least-32-characters";
const users = new Map([
  [
    "50:7",
    {
      id: "50",
      universityId: "7",
      roles: ["technician"],
      userStatus: "active",
      universityStatus: "active",
    },
  ],
  [
    "51:7",
    {
      id: "51",
      universityId: "7",
      roles: ["university_admin"],
      userStatus: "active",
      universityStatus: "active",
    },
  ],
  [
    "60:8",
    {
      id: "60",
      universityId: "8",
      roles: ["university_admin"],
      userStatus: "active",
      universityStatus: "active",
    },
  ],
]);
const laboratories = new Map([
  ["7:20", { id: "20" }],
  ["7:21", { id: "21" }],
  ["8:30", { id: "30" }],
]);
const assignments = new Set(["7:50:20"]);
const clients = [];
let httpServer;
let realtimeServer;
let baseUrl;

before(async () => {
  httpServer = createServer(express());
  realtimeServer = createRealtimeServer(httpServer, {
    clientOrigin: "http://localhost:5173",
    accessSecret: secret,
    authRepository: {
      async findActiveUserById(userId, universityId) {
        return users.get(`${userId}:${universityId}`) ?? null;
      },
    },
    laboratoryAccessRepository: {
      async findAccessibleLaboratory({
        universityId,
        userId,
        laboratoryId,
        requiresAssignment,
      }) {
        const laboratory = laboratories.get(`${universityId}:${laboratoryId}`);
        if (!laboratory) return null;
        if (
          requiresAssignment &&
          !assignments.has(`${universityId}:${userId}:${laboratoryId}`)
        ) {
          return null;
        }
        return laboratory;
      },
    },
  });
  httpServer.listen(0);
  await new Promise((resolve) => httpServer.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

after(async () => {
  for (const client of clients) client.disconnect();
  await new Promise((resolve) => realtimeServer.close(resolve));
});

function token(userId, universityId, roles) {
  return createAccessToken(
    { id: userId, universityId, roles },
    { secret, expiresInMinutes: 15 },
  );
}

function connect(accessToken) {
  const client = createClient(baseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    extraHeaders: accessToken
      ? { Cookie: `clt_access=${accessToken}` }
      : undefined,
  });
  clients.push(client);
  return client;
}

function connected(client) {
  return new Promise((resolve, reject) => {
    client.once("connect", resolve);
    client.once("connect_error", reject);
    client.connect();
  });
}

function joinLaboratory(client, laboratoryId) {
  return new Promise((resolve) => {
    client.emit("laboratory:join", { laboratoryId }, resolve);
  });
}

test("realtime rejects a connection without a university session", async () => {
  const client = connect();
  const error = await new Promise((resolve) => {
    client.once("connect_error", resolve);
    client.connect();
  });

  assert.equal(error.data.code, "UNAUTHENTICATED");
});

test("tenant socket joins namespaced university and assigned laboratory rooms", async () => {
  const client = connect(token("50", "7", ["technician"]));
  await connected(client);
  const result = await joinLaboratory(client, "20");
  const serverSocket = realtimeServer.sockets.sockets.get(client.id);

  assert.equal(result.success, true);
  assert.equal(result.data.room, laboratoryRoom("7", "20"));
  assert.equal(serverSocket.rooms.has(universityRoom("7")), true);
  assert.equal(serverSocket.rooms.has(laboratoryRoom("7", "20")), true);
});

test("unassigned and cross-tenant laboratories are indistinguishable", async () => {
  const restricted = connect(token("50", "7", ["technician"]));
  const otherTenant = connect(token("60", "8", ["university_admin"]));
  await Promise.all([connected(restricted), connected(otherTenant)]);

  const [unassigned, crossTenant] = await Promise.all([
    joinLaboratory(restricted, "21"),
    joinLaboratory(otherTenant, "20"),
  ]);

  assert.equal(unassigned.error.code, "NOT_FOUND");
  assert.equal(crossTenant.error.code, "NOT_FOUND");
  assert.equal(unassigned.error.message, crossTenant.error.message);
});
