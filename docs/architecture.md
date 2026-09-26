# Architecture

The project is delivered as a **modular monolith** (NestJS backend) plus
a thin Next.js frontend. No microservices, no message broker, no Redis, no
Docker. PostgreSQL is the only persistent store.

```
Frontend (Next.js, port 3001)
       |
       |   HTTP/JSON   NEXT_PUBLIC_API_URL -> http://localhost:3000
       v
Backend (NestJS, port 3000)
       |
       |   Prisma
       v
PostgreSQL (local)
```

## Layering

The backend separates four layers per module:

```
+--------------------------------------------------+
| Presentation  (controllers, DTOs)                |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
| Application   (services: use-case orchestration) |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
| Domain        (entities, value objects, ports)   |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
| Infrastructure (Prisma repositories, CSV import) |
+--------------------------------------------------+
                       |
                       v
                  PostgreSQL
```

- `controllers` are **thin**: parse request, call a service, return a DTO.
  No business logic in controllers.
- `services` orchestrate a single use case and may call multiple domain
  components or ports.
- `domain/` contains plain TypeScript types (no NestJS decorators, no
  Prisma imports). It also declares the **ports** (interfaces) that the
  application layer depends on.
- `infrastructure/` contains the Prisma-backed implementations of those
  ports. This is the only layer allowed to import `@prisma/client`.

## Modules

The backend is organised in NestJS modules:

| Module         | Responsibility                                                    |
|----------------|-------------------------------------------------------------------|
| `meters`       | CRUD for meters and meter summary                                 |
| `readings`     | Query hourly readings                                             |
| `dashboard`    | KPIs for the dashboard                                            |
| `analytics`    | Deterministic anomaly engine (baseline → detection → classify)   |
| `ai-analysis`  | `IAiExplanationProvider` port + stub implementation + endpoints    |

Each module owns its own `infrastructure/`, `domain/`, `dto/` subfolders
where applicable.

## Ports and DI tokens

When an interface needs to be substitutable in tests or with a future
implementation, it is exposed through a NestJS injection token:

| Interface                  | Token                     | Implementation                     |
|----------------------------|---------------------------|------------------------------------|
| `MeterReadingRepository`   | `METER_READING_REPOSITORY` | `PrismaMeterReadingRepository`     |
| `MeterEventRepository`     | `METER_EVENT_REPOSITORY`   | `PrismaEventRepository`            |
| `IAiExplanationProvider`   | `AI_EXPLANATION_PROVIDER`   | `StubAiExplanationProvider`        |

Tokens live in `analytics.tokens.ts` and `ai-analysis.tokens.ts`.

## Analytics engine

The deterministic engine is a **pipeline of pure functions**:

```
BaselineCalculator, SpikeDetector, PersistentDeviationDetector,
OutlierDetector, ElectricalConsistencyChecker, DataQualityAnalyzer,
EventCorrelator, AnomalyClassifier, SeverityCalculator,
ConfidenceCalculator, PriorityCalculator
```

Each component lives in `src/modules/analytics/components/` and is free
of NestJS / Prisma imports. They take data, return evidence. The
`AnalyticsService` is the only place that wires them to repositories and
to the persistence layer. Thresholds live in
`src/shared/constants/analytics.constants.ts`.

The engine produces structured `AnalyticsEvidence` (baseline, deviation,
outliers, consistency, data-quality score, matched event). The
classifier reads only that evidence to emit a type / severity / priority.
**No machine learning, no randomness, no LLM** is involved in detection.

## AI explainability layer

The AI layer is a **read-only consumer** of the analytics evidence.

```
AnomalyController
  -> AiAnalysisService
       -> IAiExplanationProvider (port)
            ^ bound to StubAiExplanationProvider via AI_EXPLANATION_PROVIDER
       -> PrismaAnomalyRepository.updateAiExplanation(id, text, action)
```

It persists `ai_explanation` and `recommended_action` on the existing
`anomaly` row. It never modifies `type`, `severity`, `priority`,
`confidence`, or `evidence`. This is enforced both at the application
layer (no code path writes those columns from the AI service) and by
regression tests in `src/modules/ai-analysis/__tests__/acceptance/`.

A future OpenAI implementation can be added without touching the
analytics engine or the controller — just bind a new class to the same
`AI_EXPLANATION_PROVIDER` token. This MVP does NOT include an OpenAI SDK.

## Frontend architecture

```
src/app/            App Router pages
src/components/
   ui/              Generic primitives (Card, Badge, Button, states)
   charts/          Recharts wrappers
   domain/          Meter, anomaly, evidence, AI panels
src/lib/
   api-client.ts    Single typed HTTP client
   types.ts         DTOs mirrored from the backend
   format.ts        Number / date / kWh formatters
   hooks/use-async.ts   loading | ready | error hook
```

- **One** HTTP client (`src/lib/api-client.ts`). Components never call
  `fetch` directly.
- **No analytics logic** in the frontend. All numbers come from the
  backend.
- Visual hierarchy uses color + text + icon for severity / type badges.
- Loading / empty / error states are handled by every list and detail
  view.

## What the project is NOT

- Not microservices. One NestJS process owns everything.
- Not event-driven. No Kafka / Redis / RabbitMQ. The pipeline is
  request-driven and synchronous.
- Not containerised at runtime. PostgreSQL is local, no Docker.
- Not auth-protected. AGENTS.md §33 does not require login for the
  challenge.
- Not storing credentials in source. All secrets live in `.env`,
  gitignored.
