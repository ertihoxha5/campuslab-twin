import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRuleBasedRecommendations } from "../src/modules/analytics/recommendations.js";
import { createAnalyticsService } from "../src/modules/analytics/service.js";

test("recommendations expose the exact rule, threshold, evidence, and action", () => {
  const [recommendation] = buildRuleBasedRecommendations({
    metric: "co2",
    summary: { value: 850, minimum: 420, maximum: 1450, samples: 24 },
  });
  assert.equal(recommendation.ruleId, "co2.high");
  assert.deepEqual(recommendation.evidence, {
    observed: 1450,
    operator: ">",
    threshold: 1000,
    unit: "ppm",
    samples: 24,
  });
  assert.match(recommendation.explanation, /1450 ppm > pragu 1000 ppm/);
  assert.ok(recommendation.action.length > 10);
});

test("power recommendation compares a stored peak against 1.5 times the average", () => {
  const [recommendation] = buildRuleBasedRecommendations({
    metric: "power",
    summary: { value: 2000, minimum: 800, maximum: 4200, samples: 30 },
  });
  assert.equal(recommendation.ruleId, "power.peak_ratio");
  assert.equal(recommendation.evidence.threshold, 3000);
  assert.match(recommendation.explanation, /1\.5× mesataren 2000 W/);
});

test("rules do not invent recommendations without evidence or a triggered threshold", () => {
  assert.deepEqual(
    buildRuleBasedRecommendations({
      metric: "temperature",
      summary: { value: 22, minimum: 20, maximum: 24, samples: 0 },
    }),
    [],
  );
  assert.deepEqual(
    buildRuleBasedRecommendations({
      metric: "temperature",
      summary: { value: 22, minimum: 20, maximum: 24, samples: 12 },
    }),
    [],
  );
});

test("analytics response explicitly identifies documented rule-based methodology", async () => {
  const service = createAnalyticsService({
    repository: {
      async history() {
        return {
          summary: { value: 850, minimum: 420, maximum: 1450, samples: 24 },
          series: [],
          provenance: [{ source: "physical", samples: 24 }],
        };
      },
    },
  });
  const result = await service.history(
    {
      metric: "co2",
      startAt: "2026-08-01T00:00:00.000Z",
      endAt: "2026-08-08T00:00:00.000Z",
    },
    { universityId: "7", userId: "9", roles: ["observer"] },
  );
  assert.equal(result.recommendationMethod.type, "rule_based");
  assert.equal(result.recommendations[0].ruleId, "co2.high");
  assert.doesNotMatch(
    JSON.stringify(result.recommendationMethod),
    /machine learning|artificial intelligence|prediction/i,
  );
});
