import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { calculateInfrastructureHealth } from "../src/modules/dashboard/service.js";
import { scenarioDefinitions } from "../src/modules/simulator/scenarios.js";

const documentationUrl = new URL(
  "../../docs/simulation-and-reporting.md",
  import.meta.url,
);

test("simulation documentation covers every implemented scenario", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  for (const scenario of Object.keys(scenarioDefinitions)) {
    assert.ok(documentation.includes(`\`${scenario}\``), scenario);
  }
});

test("documented infrastructure health example matches implementation", () => {
  const health = calculateInfrastructureHealth({
    averageEquipmentHealth: 90,
    faultEquipment: 1,
    totalEquipment: 10,
    offlineSensors: 2,
    totalSensors: 20,
    criticalAlerts: 1,
  });
  assert.equal(health, 81);
});
