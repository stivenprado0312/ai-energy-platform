# AI explainability

The AI explainability layer renders the structured analytics evidence into
plain language and a recommended action. It is **read-only** with respect
to the deterministic verdict: it never detects anomalies, never
recomputes baselines, never reclassifies a meter.

## Source of truth

The Phase 2 deterministic engine produces `type`, `severity`, `priority`,
`confidence` and `evidence`. The AI layer is a downstream consumer that
turns `evidence` into a readable explanation. The columns written by the
AI layer are restricted to `ai_explanation` and `recommended_action` on
the existing `anomaly` row.

```
Anomaly row (read-only columns)        Anomaly row (AI columns)
+---------------------------------+    +--------------------------+
| id                              |    | ai_explanation          |
| meter_id, type, severity, ...   |    | recommended_action      |
| window_start, window_end       |    +--------------------------+
| baseline_kwh, observed_kwh       |
| deviation_percent              |
| confidence, priority           |
| related_event_id                |
| evidence (JSON)                 |
+---------------------------------+
```

## Provider abstraction

The layer lives under `ai-energy-platform-api/src/modules/ai-analysis/`.

```ts
export interface AiExplanationInput {
  meterId: string;
  anomalyType: AnomalyType;       // REAL_ANOMALY | EXPLAINABLE | ...
  severity: Severity;             // HIGH | MEDIUM | LOW
  priority: string;               // HIGH | MEDIUM | LOW
  confidence: number;
  evidence: AnalyticsEvidence;     // full structured evidence from Phase 2
  relatedEvent?: MatchedEvent;     // present if the event correlator matched one
}

export interface AiExplanationOutput {
  summary: string;                 // one-line verdict
  whyItMatters: string;            // operational impact, phrased carefully
  evidence: string[];             // bullet list drawn from input values
  recommendation: string;          // actionable next step
}

export interface IAiExplanationProvider {
  explain(input: AiExplanationInput): Promise<AiExplanationOutput>;
}
```

The application layer depends only on `IAiExplanationProvider`. The
concrete implementation is bound to the DI token `AI_EXPLANATION_PROVIDER`
in `ai-analysis.module.ts`.

```ts
{
  provide: AI_EXPLANATION_PROVIDER,
  useExisting: StubAiExplanationProvider,
}
```

Swapping in a real OpenAI provider later is a one-line change. The
analytics engine and the controllers are not touched.

## StubAiExplanationProvider

The default and only provider in this MVP is
`StubAiExplanationProvider`
(`src/modules/ai-analysis/infrastructure/stub-ai-explanation.provider.ts`).

Contract:

- **Deterministic.** Identical input → identical output, byte-for-byte.
- **Honest.** It reads values directly from the input evidence and
  formats them. It never invents numbers, never asserts causation that
  the evidence does not support, and never references data that is not in
  the input.
- **Cautious language.** It uses phrases like "the evidence indicates",
  "is consistent with", "the deviation coincides with", "no operational
  event coincides with" — never "this is caused by X" unless the
  matched event description itself names the cause.
- **Recommendation per category.** The recommendation is derived from the
  category, not invented:

  | Category        | Recommendation angle                                                        |
  |-----------------|----------------------------------------------------------------------------|
  | `REAL_ANOMALY`  | Investigate operation / equipment. Compare with operational context.        |
  | `EXPLAINABLE`   | Validate that the matched operational event actually occurred.              |
  | `FALSE_POSITIVE`| Do not escalate. Continue monitoring.                                      |
  | `DATA_QUALITY`  | Review sensor and calibration. Do not trust consumption figures.           |
  | `NORMAL`        | No action.                                                                |

## Endpoints

| Method | Path                                            | Effect                                                                                  |
|--------|-------------------------------------------------|-----------------------------------------------------------------------------------------|
| POST   | `/anomalies/:id/explanation`                    | Generate and persist explanation for a single anomaly.                                  |
| POST   | `/meters/:meterId/anomalies/explanations`       | Generate explanations for all anomalies of a meter (returns `generated`, `failed`).      |
| POST   | `/ai/analyze` with `{ "explain": true }`        | Run the deterministic engine and then generate explanations for each persisted anomaly. |

All three reuse the same `IAiExplanationProvider` instance. The
endpoints only call `IAiExplanationProvider.explain(...)` and persist the
result; they do not contain business logic.

## Persistence

```sql
-- Schema excerpt (Prisma)
model Anomaly {
  id                String  @id @default(cuid())
  ...
  aiExplanation     String? @map("ai_explanation")
  recommendedAction String? @map("recommended_action")
  ...
}
```

The application uses `PrismaAnomalyRepository.updateAiExplanation(id,
text, recommendation)` which writes only those two columns. The
deterministic columns are never included in the update payload.

A regression acceptance test
(`src/modules/ai-analysis/__tests__/acceptance/regression.spec.ts`)
verifies that after calling the explanation endpoint:

- `type`, `severity`, `priority`, `confidence`, and `evidence` are
  unchanged.
- `aiExplanation` and `recommendedAction` are populated.
- Re-generating the explanation overwrites only the AI columns.

## How a future OpenAI provider would fit

To add OpenAI:

1. Add `npm install openai` (NOT done in this MVP).
2. Create `OpenAiExplanationProvider implements IAiExplanationProvider` in
   `infrastructure/`.
3. Read `OPENAI_API_KEY` from env (already declared in
   `.env.example`/`.env`).
4. Update `ai-analysis.module.ts` to bind `AI_EXPLANATION_PROVIDER` to
   the new class when an env flag (or runtime check) requests it.

The analytics engine, the controllers, the persistence layer, and the
frontend do not need to change.

## What the AI layer does NOT do

- It does not detect anomalies.
- It does not compute baselines, deviations, or z-scores.
- It does not reclassify the type.
- It does not modify severity, priority, or confidence.
- It does not modify the structured `evidence`.
- It does not write to any column other than `ai_explanation` and
  `recommended_action`.
- It does not call any external service in this MVP (the stub is fully
  offline).
