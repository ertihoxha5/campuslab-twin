import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredCommands = [
  "npm install",
  "npm run db:migrate",
  "npm run db:seed",
  "npm run db:verify",
  "npm run dev",
  "npm run lint",
  "npm test",
  "npm run build",
];

test("setup guide documents every reproducible handoff command", async () => {
  const guide = await readFile(
    new URL("../../docs/setup.md", import.meta.url),
    "utf8",
  );

  for (const command of requiredCommands) {
    assert.match(guide, new RegExp(command.replaceAll(" ", "\\s+"), "u"));
  }
});

test("setup guide covers every environment variable in the example", async () => {
  const [guide, environmentExample] = await Promise.all([
    readFile(new URL("../../docs/setup.md", import.meta.url), "utf8"),
    readFile(new URL("../../.env.example", import.meta.url), "utf8"),
  ]);
  const variables = environmentExample
    .split(/\r?\n/u)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line))
    .map((line) => line.slice(0, line.indexOf("=")));

  assert.ok(variables.length > 0);
  for (const variable of variables) {
    assert.match(guide, new RegExp(`\\b${variable}\\b`, "u"));
  }
});
