# Implementation Plan — AI Energy Platform

This document describes the **technical plan** for implementing the MVP
described in `AGENTS.md`, based on the findings recorded in
`docs/data-analysis.md`.

The implementation is delivered in the six phases defined by AGENTS.md
(`Phase 0` through `Phase 6`). This file is updated as each phase lands.

---

## 1. Tech stack

| Layer        | Choice                                                              |
|--------------|---------------------------------------------------------------------|
| Language     | TypeScript (strict)                                                 |
| Backend      | NestJS (modular monolith), Jest                                     |
| ORM          | Prisma                                                              |
| Database     | PostgreSQL, local, configured via `DATABASE_URL` (no Docker)        |
| Frontend     | Next.js (App Router), Tailwind CSS, Recharts                        |
| AI           | `ILLMProvider` interface; default `StubDeterministicProvider`       |
| Config       | `.env` / `.env.example`, `src/shared/constants.ts` for thresholds   |

`LLM_PROVIDER=stub` is the only requirement for the MVP. `openai` is a
drop-in addition behind the same interface.

---

## 2. High-level architecture

```
                     +--------------------------+
                     |   Next.js App (frontend) |
                     +------------+-------------+
                                  | REST
                                  v
+--------------------------------------------------------------+
|                NestJS modular monolith (API)                |
|                                                              |
|  modules/                                                    |
|    meters/      dashboard/    analytics/    anomalies/       |
|    readings/    events/                    ai-analysis/      |
|                                                              |
|  infrastructure/                                             |
|    database/   (Prisma client)                               |
|    ai/         (ILLMProvider + StubDeterministicProvider)    |
|                                                              |
|  shared/      constants, types, utilities                    |
+--------------------------------------------------------------+
                                  |
                                  v
                            PostgreSQL
```

The analytics engine produces **structured evidence** (a typed object, not
free text). The AI explanation layer only consumes that evidence and
turns it into natural language.

---

## 3. Analytics pipeline

```
Readings
  -> DataValidator
  -> BaselineCalculator
  -> SpikeDetector
  -> PersistentDeviationDetector
  -> OutlierDetector
  -> ElectricalConsistencyChecker
  -> DataQualityAnalyzer
  -> EventCorrelator
  -> AnomalyClassifier
  -> SeverityCalculator
  -> ConfidenceCalculator
  -> PriorityCalculator
  -> AIExplanation (StubDeterministicProvider)
  -> RecommendedAction
```

Every step is a small, single-responsibility class located under
`src/modules/analytics/`. No LLM is involved before the final explanation
step.

### 3.1 Component contracts (signatures only)

```ts
interface BaselineCalculator {
  compute(readings: Reading[]): Baseline;
}
interface SpikeDetector {
  detect(readings: Reading[], baseline: Baseline): Spike[];
}
interface PersistentDeviationDetector {
  detect(readings: Reading[], baseline: Baseline): DeviationWindow[];
}
interface OutlierDetector {
  detect(readings: Reading[]): Outlier[];
}
interface ElectricalConsistencyChecker {
  check(readings: Reading[]): ConsistencyReport;
}
interface DataQualityAnalyzer {
  analyze(outliers: Outlier[], consistency: ConsistencyReport): DataQualityReport;
}
interface EventCorrelator {
  correlate(windows: DeviationWindow[], events: Event[]): EventMatch[];
}
interface AnomalyClassifier {
  classify(input: ClassifierInput): AnomalyType;
}
interface SeverityCalculator {
  compute(input: SeverityInput): Severity;
}
interface ConfidenceCalculator {
  compute(input: ConfidenceInput): number; // 0..1
}
interface PriorityCalculator {
  compute(input: PriorityInput): Priority;
}
```

### 3.2 Classification rules

```
if dataQualityScore > threshold            -> DATA_QUALITY
else if |deviation| < smallThreshold       -> NORMAL
else if matchingEvent == OPERATIONAL_CHANGE -> EXPLAINABLE
else if matchingEvent == SCHEDULED_OUTAGE   -> FALSE_POSITIVE
else if no event AND electrical signals suspicious -> REAL_ANOMALY
else                                          -> EXPLAINABLE (low confidence)
```

### 3.3 Severity rules

```
HIGH   if type == DATA_QUALITY
HIGH   if type == REAL_ANOMALY  and |deviation| > 50
MEDIUM if type == REAL_ANOMALY  and |deviation| in [20, 50]
MEDIUM if type == EXPLAINABLE   and |deviation| > 30
LOW    if type == FALSE_POSITIVE
LOW    if type == NORMAL
```

### 3.4 Confidence

```
confidence = clamp(0.5 + 0.5 * evidenceStrength, 0, 1)
evidenceStrength = function of:
  - number of aligned signals
  - z-score magnitude
  - presence / absence of correlated event
```

### 3.5 Priority

```
score = severityWeight * severityRank + confidenceWeight * confidence
priority = HIGH | MEDIUM | LOW according to score buckets
```

---

## 4. Database schema (Prisma)

```prisma
model Meter {
  id        String    @id @default(cuid())
  code      String    @unique          // "M-101"
  readings  Reading[]
  events    Event[]
  anomalies Anomaly[]
}

model Reading {
  id             BigInt   @id @default(autoincrement())
  meterId        String
  meter          Meter    @relation(fields: [meterId], references: [code])
  timestamp      DateTime
  consumptionKwh Float    @map("consumption_kwh")
  voltageV       Float    @map("voltage_v")
  currentA       Float    @map("current_a")
  powerFactor    Float
  status         String
  @@unique([meterId, timestamp])
  @@index([meterId, timestamp])
}

model Event {
  id             String   @id @default(cuid())
  meterId        String
  meter          Meter    @relation(fields: [meterId], references: [code])
  eventTimestamp DateTime @map("event_timestamp")
  eventType      String   @map("event_type")
  description    String
  @@index([meterId, eventTimestamp])
}

model Anomaly {
  id                String   @id @default(cuid())
  meterId           String
  meter             Meter    @relation(fields: [meterId], references: [code])
  type              String   // REAL_ANOMALY | EXPLAINABLE | FALSE_POSITIVE | DATA_QUALITY | NORMAL
  severity          String   // HIGH | MEDIUM | LOW
  confidence        Float
  priority          String   // HIGH | MEDIUM | LOW
  detectedAt        DateTime
  windowStart       DateTime
  windowEnd         DateTime
  baselineKwh       Float
  observedKwh       Float
  deviationPercent  Float
  voltageDeviation  Float?
  currentDeviation  Float?
  pfDeviation       Float?
  relatedEventId    String?
  electricalRatio   Float?
  evidence          Json
  aiExplanation     String?
  recommendedAction String?
  createdAt         DateTime @default(now())
  @@index([meterId, type, priority])
}

model Analysis {
  id         String    @id @default(cuid())
  status     String    // RUNNING | DONE | FAILED
  meterId    String?
  startedAt  DateTime
  finishedAt DateTime?
  summary    Json?
  error      String?
}
```

---

## 5. REST API

All endpoints are thin controllers; business logic lives in services.

```
GET    /meters
GET    /meters/:meterId
GET    /meters/:meterId/readings?from=&to=
GET    /meters/:meterId/events
GET    /dashboard/summary
GET    /anomalies?meterId=&type=&severity=&priority=
GET    /anomalies/:id
POST   /ai/analyze              { meterId?: string, allMeters?: boolean }
GET    /ai/analysis/:id
```

`POST /ai/analyze` runs the pipeline synchronously and persists the
resulting anomalies. Status is communicated honestly to the frontend.

---

## 6. AI / LLM layer

```ts
export interface ILLMProvider {
  explain(input: LlmInput): Promise<LlmOutput>;
}

export interface LlmInput {
  meterId: string;
  anomalyType: AnomalyType;
  severity: Severity;
  evidence: Evidence;
  relatedEvent?: EventRef;
}

export interface LlmOutput {
  summary: string;
  reason: string;
  recommendedAction: string;
  confidenceNote: string;
}
```

The default `StubDeterministicProvider` renders the evidence into text
using pure templates. When evidence is weak it explicitly communicates
uncertainty. An `OpenAIProvider` may be added later behind the same
interface without touching the domain, analytics, persistence, or
frontend code.

---

## 7. Frontend routes

```
/login             (mock)
/dashboard
/meters/[meterId]
/ai
/anomalies
/anomalies/[id]
```

Demo path: `/login` → `/dashboard` → `/meters/M-109` → "Run AI Analysis" →
`/ai` → `/anomalies/[id]`.

Charts (Recharts) are limited to those with analytical value:
consumption vs baseline, voltage, current, power factor, and event
markers on the timeline.

---

## 8. Test plan

Unit tests live next to the component they cover (e.g.
`baseline.calculator.spec.ts`). The four critical-meter acceptance tests
live under `src/modules/analytics/__tests__/acceptance/`:

| File               | Asserts                                              |
|--------------------|------------------------------------------------------|
| `m-104.spec.ts`    | `type === EXPLAINABLE`  and `severity === MEDIUM`    |
| `m-106.spec.ts`    | `type === FALSE_POSITIVE` and `severity === LOW`    |
| `m-109.spec.ts`    | `type === REAL_ANOMALY` and `severity === HIGH`     |
| `m-112.spec.ts`    | `type === DATA_QUALITY` and `severity === HIGH`     |

These tests load the real `data/readings.csv` and `data/events.csv`
through a shared fixture; they assert **only** the category and severity
buckets. Numerical thresholds are not asserted.

---

## 9. Phased delivery

| Phase | Goal                                                                   | Status      |
|-------|------------------------------------------------------------------------|-------------|
| 0     | Repo skeleton, dataset copied, docs in place                            | **done**    |
| 1     | NestJS bootstrap, Prisma schema, migrations, seed, basic endpoints     | pending     |
| 2     | Analytics components + unit tests + 4 acceptance tests                 | pending     |
| 3     | Anomaly persistence, `ILLMProvider`, `StubDeterministicProvider`, AI endpoints | pending |
| 4     | Next.js bootstrap, layout, login mock, dashboard, meter detail, charts | pending     |
| 5     | AI analysis screen, anomalies list, investigation screen                | pending     |
| 6     | UX polish, loading/error/empty states, README, smoke test, demo prep   | pending     |

If time is constrained, P0 items (dataset ingestion, backend, analytics,
M-109, dashboard, meter detail, AI explanation) take priority over P1
(M-104, M-106, M-112, anomaly list, filters, charts, tests) and P2
(visual polish, additional UX, documentation).

---

## 10. Open assumptions

- PostgreSQL is reachable on `localhost:5432`. The user must create the
  database referenced by `DATABASE_URL` manually.
- The default AI provider is `stub`. No external API is contacted unless
  the user explicitly sets `LLM_PROVIDER=openai` and provides
  `OPENAI_API_KEY`.
- The dataset is treated as immutable. The seed only reads from
  `data/readings.csv` and `data/events.csv`.
