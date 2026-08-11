import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { realtimeEvents } from "../src/realtime/publisher.js";

const documentationUrl = new URL("../../docs/socket-io.md", import.meta.url);

test("Socket.IO documentation covers every server-published event", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  for (const eventName of Object.values(realtimeEvents)) {
    assert.ok(documentation.includes(`\`${eventName}\``), eventName);
  }
  assert.ok(documentation.includes("`laboratory:join`"));
  assert.ok(documentation.includes("`laboratory:leave`"));
});
