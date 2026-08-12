import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredDemoTopics = [
  "regjistrim",
  "miratim",
  "izolimi multi-tenant",
  "monitorimi",
  "Digital Twin 3D",
  "alarmi",
  "mirëmbajtja",
  "simulimi dhe analitika",
  "raporti",
];

test("thesis demo documentation covers the complete required workflow", async () => {
  const document = await readFile(
    new URL("../../docs/demo-and-limitations.md", import.meta.url),
    "utf8",
  );

  for (const topic of requiredDemoTopics) {
    assert.match(document, new RegExp(topic, "iu"), `Mungon tema: ${topic}`);
  }

  assert.match(document, /DEMO_ACCOUNT_PASSWORD/u);
  assert.match(document, /Kufizimet e njohura/u);
  assert.match(document, /sensorëve janë sintetike/u);
});
