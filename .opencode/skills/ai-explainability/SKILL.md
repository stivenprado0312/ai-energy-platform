---
name: ai-explainability
description: AI explainability rules for the AI Energy Platform. Applied automatically when designing or modifying the AI provider abstraction, the explanation endpoint, or any code that consumes analytics evidence to produce natural-language explanations under ai-energy-platform-api/src/modules/ai-analysis/. Complements AGENTS.md § 21–§ 25.
---

# AI Explainability Skill — AI Energy Platform

This skill is the **operational checklist** for the AI explainability
layer. It complements `AGENTS.md` § 21–§ 25 with concrete rules for the
provider abstraction, evidence consumption, and the deterministic stub.

## 1. The deterministic engine is the source of truth

The Phase 2 analytics engine produces the **evidence**, the **type**,
the **severity**, the **priority**, and the **confidence** of every
anomaly. The AI layer **must not** change any of those.

What the AI layer may do:

- Render the evidence into natural language.
- Recommend an action derived from the category and the evidence.

What the AI layer must NOT do:

- Detect new anomalies (no scanning of the 4032 raw readings).
- Recompute baselines, deviation percentages, or z-scores.
- Reclassify the type (`REAL_ANOMALY` -> `EXPLAINABLE` etc.).
- Upgrade or downgrade severity.
- Override confidence or priority.
- Use `expected_results.csv` (AGENTS.md § 7).

## 2. Provider abstraction

```
interface IAiExplanationProvider {
  explain(input: AiExplanationInput): Promise<AiExplanationOutput>;
}
```

The provider lives behind a DI token (`AI_EXPLANATION_PROVIDER`). The
domain / application layer depends only on the interface. A concrete
provider (Stub or OpenAI) is bound in the module.

The interface must accept:

- `meterId`
- `anomalyType`
- `severity`
- `evidence`  (structured AnalyticsEvidence)
- `relatedEvent`  (optional MatchedEvent)

The output must contain at minimum:

- `summary`         (one-sentence verdict)
- `whyItMatters`    (the operational impact, phrased carefully)
- `evidence`        (a list of short evidence bullets)
- `recommendation`  (a concrete next step)

## 3. Stub provider contract

`StubAiExplanationProvider` is the **default and only** provider in this
phase. It must:

- Be **deterministic**: identical input produces identical output.
- Use **only the data present in the input**. No fabricated numbers,
  no invented timestamps, no claimed causes that aren't in the
  evidence.
- Produce text that names the **actual evidence fields** (baseline
  mean, observed mean, deviation %, matched event description, data
  quality score) by reading them off the input.
- Phrase conclusions with **cautious language** ("the evidence
  indicates", "is consistent with", "the deviation coincides with")
  rather than asserting cause-and-effect when only correlation is
  available.

## 4. Recommendation rules per category

Recommendations must be derived **from the category**, not invented:

| Category         | Recommendation angle |
|------------------|----------------------|
| `REAL_ANOMALY`   | Investigate operation / equipment. Compare with operational context. Prioritise inspection when severity is HIGH. |
| `EXPLAINABLE`    | Note that an operational event coincides. Suggest follow-up / validation of the event. |
| `FALSE_POSITIVE` | The deviation coincides with a known event (outage). Suggest monitoring, do not escalate as an incident. |
| `DATA_QUALITY`   | Review the sensor / meter. Validate calibration, wiring and data pipeline. Do not treat observed consumption as real consumption. |

The recommendation must always be **actionable** and **bounded by the
evidence**. No claim like "this is caused by equipment failure" unless
the evidence names that cause.

## 5. Phrasing rules (causal language)

- Never assert certainty when only correlation exists.
- Prefer verbs: "the evidence indicates", "the deviation is
  consistent with", "no operational event coincides with".
- When the deviation magnitude is small, say so explicitly.
- When the data quality score is high, surface it prominently — the
  user must not mistake a noisy meter for a real consumption anomaly.

## 6. Persistence

The output of `explain()` is stored in two existing columns on the
`Anomaly` table:

- `ai_explanation`  (TEXT, nullable)
- `recommended_action` (TEXT, nullable)

Re-generating the explanation **overwrites** those fields and leaves
all other fields untouched:

- `type`, `severity`, `priority`, `confidence` are preserved.
- `evidence` JSON is preserved.

This is enforced both at the application level (do not pass those
fields into `updateAiExplanation`) and at the test level (regression
tests assert no change).

## 7. Test discipline (ai-specific)

Unit tests:

- Stub produces **identical output for identical input** (determinism).
- Output uses **only** values found in the input evidence.
- Each category produces the matching recommendation shape.

Acceptance tests (real DB, Phase 2 anomalies):

- M-104 explanation mentions the OPERATIONAL_CHANGE event and keeps
  the anomaly as EXPLAINABLE / MEDIUM.
- M-106 explanation mentions the SCHEDULED_OUTAGE and keeps
  FALSE_POSITIVE / LOW.
- M-109 explanation mentions consumption jump + electrical evidence
  + absence of an operational event, keeps REAL_ANOMALY / HIGH.
- M-112 explanation mentions data-quality inconsistency, keeps
  DATA_QUALITY / HIGH.
- Regression test: after calling the explanation endpoint, the
  anomaly row's `type`, `severity`, `priority`, `confidence`,
  `evidence` JSON are unchanged.

## 8. Forbidden patterns

- Calling an external LLM SDK in the default provider.
- Hardcoding the same explanation string regardless of evidence.
- Asserting cause-and-effect in language that the evidence does not
  support.
- Reading `expected_results.csv` for any reason.

## 9. Definition of done (ai change)

1. All four acceptance tests pass.
2. Regression test (no field changes after explanation) passes.
3. Unit tests for the stub pass.
4. E2E tests for the new endpoints pass.
5. `tsc`, `build` and `lint` exit 0.
