# AI Energy Platform

Technical challenge MVP for electrical energy monitoring and anomaly
management. The platform ingests hourly electrical-meter readings, detects
anomalous behaviour with a fully deterministic engine, explains each
finding using a pluggable AI explanation layer, and recommends a next
action.

Core business flow:

```
DATA  -> ANALYSIS -> ANOMALY -> EXPLANATION -> PRIORITIZATION -> ACTION
```

The four critical meters (M-104, M-106, M-109, M-112) drive the evaluation
and the demo. See "Critical cases" below.

---

## 1. Stack

| Layer       | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Backend     | NestJS 10, TypeScript 5, Prisma 5, PostgreSQL (local, no Docker) |
| Frontend    | Next.js 15 (App Router), TypeScript 5, Tailwind CSS, Recharts   |
| AI          | `ILLMProvider` abstraction; default `StubDeterministicProvider`  |
| Tests       | Jest (backend unit + e2e + acceptance; frontend component)        |

---

## 2. Repository structure

```
ai-energy-platform/
|-- AGENTS.md                      Source of truth for project rules
|-- README.md                      This file
|-- .env.example                   Backend env placeholders
|-- .gitignore
|-- data/
|   |-- readings.csv               4,032 hourly readings, 12 meters, 14 days
|   `-- events.csv                 4 operational events for the critical meters
|-- docs/
|   |-- data-analysis.md           Real findings from the dataset
|   |-- implementation-plan.md     Per-phase plan and current status
|   |-- architecture.md            Layered architecture overview
|   |-- analytics.md               Analytics pipeline documentation
|   |-- ai-explainability.md       AI provider and stub documentation
|   `-- api.md                     REST API reference
|-- ai-energy-platform-api/        NestJS backend (Phase 1 + 2 + 3)
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- seed.ts
|   |   `-- migrations/
|   `-- src/
|       |-- main.ts
|       |-- app.module.ts
|       |-- infrastructure/
|       |   |-- database/          Prisma service + module
|       |   `-- import/           CSV parser and importer
|       |-- shared/                 Constants, error types, exception filter
|       `-- modules/
|           |-- meters/            Meters CRUD (Phase 1)
|           |-- readings/          Readings query
|           |-- dashboard/         Dashboard summary
|           |-- analytics/         Deterministic anomaly engine (Phase 2)
|           `-- ai-analysis/       AI explanation layer (Phase 3)
|-- ai-energy-platform-app/        Next.js frontend (Phase 4)
|   |-- src/
|   |   |-- app/                   App Router pages
|   |   |-- components/            ui/, charts/, domain/
|   |   |-- lib/                   api-client, types, format, hooks
|   |   `-- styles/
|   `-- tests/                     Jest component tests
`-- .opencode/
    `-- skills/                    Backend, testing, architecture, analytics,
                                    anomaly-detection, ai-explainability,
                                    frontend
```

---

## 3. Requirements

- **Node.js** 18.18+ (tested on 20 / 22 / 24)
- **PostgreSQL** 12+ running locally (no Docker — AGENTS.md §5 forbids it)
- npm (or pnpm / yarn)

---

## 4. Configuring PostgreSQL

This project does NOT use Docker. You need a local PostgreSQL instance.

Suggested one-time setup (replace `REPLACE_ME` with a password of your
choice; the example below uses the credentials documented in the env
files):

```bash
psql -U postgres -h 127.0.0.1 -c "CREATE ROLE aiep LOGIN PASSWORD 'aiep_dev_password';"
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE ai_energy_platform OWNER aiep;"
psql -U postgres -h 127.0.0.1 -d ai_energy_platform -c "GRANT ALL ON SCHEMA public TO aiep;"
```

If your local PostgreSQL already has a different role/database, adjust the
`DATABASE_URL` in the backend `.env` file to match.

---

## 5. Backend setup

```bash
cd ai-energy-platform-api
cp .env.example .env
# Edit .env: set DATABASE_URL to your local PostgreSQL credentials.

npm install
npx prisma migrate deploy          # applies both migrations (init + anomaly)
npx prisma generate                # generates the Prisma client
npm run db:seed                    # loads data/readings.csv and data/events.csv

# Expected output:
#   Seed complete: 12 meters, 4032 readings, 4 events

npm run start                      # listens on PORT (default 3000)
```

Alternative development commands:

| Command                | Effect                                              |
|------------------------|-----------------------------------------------------|
| `npm run start:dev`    | Nest start with `--watch` (live reload)            |
| `npm run prisma:migrate` | `prisma migrate dev` (creates shadow DB on first run) |
| `npm run prisma:studio` | Opens Prisma Studio on port 5555                  |

The backend listens on `PORT` (default **3000**) and exposes all endpoints
under that origin.

---

## 6. Frontend setup

The frontend runs on **port 3001** by default to avoid colliding with the
backend on port 3000.

```bash
cd ai-energy-platform-app
cp .env.example .env.local
# .env.local already contains NEXT_PUBLIC_API_URL=http://localhost:3000

npm install
npm run build        # optional: production build
npm run dev          # development server on http://localhost:3001
# or
npm run start        # production server on http://localhost:3001
```

The frontend reads `NEXT_PUBLIC_API_URL` to know where to call the backend.
The `next.config.js` also exposes a server-side rewrite at `/api/*` for
proxied requests, but pages call the backend directly via `NEXT_PUBLIC_API_URL`.

URLs to open in the browser:

- `http://localhost:3001/`            — operations dashboard
- `http://localhost:3001/meters`       — all 12 meters
- `http://localhost:3001/meters/M-109` — M-109 detail (the primary demo case)
- `http://localhost:3001/anomalies`   — full anomalies list with filters

---

## 7. Running both at the same time

Open two terminals.

Terminal A — backend on :3000:

```bash
cd ai-energy-platform-api
npm run start
```

Terminal B — frontend on :3001:

```bash
cd ai-energy-platform-app
npm run dev
```

Then open `http://localhost:3001`.

If you need to change either port, edit `PORT` in the backend `.env` and
`next.config.js` / the `dev` / `start` scripts in the frontend
`package.json`. The Next.js rewrite and `NEXT_PUBLIC_API_URL` must agree on
the backend origin.

---

## 8. Endpoints

Full reference: [`docs/api.md`](docs/api.md). Quick index:

| Method | Path                                        | Purpose                          |
|--------|---------------------------------------------|----------------------------------|
| GET    | `/dashboard/summary`                       | KPIs for the dashboard           |
| GET    | `/meters`                                   | All 12 meters + counts           |
| GET    | `/meters/:meterId`                          | Meter detail + summary           |
| GET    | `/meters/:meterId/readings?from=&to=&limit=` | Hourly readings (default 1–5000) |
| GET    | `/meters/:meterId/anomalies`               | Anomalies for a single meter      |
| GET    | `/anomalies?meterId=&type=&severity=&priority=` | List / filter anomalies      |
| GET    | `/anomalies/summary`                       | Counts by type / severity / prio |
| GET    | `/anomalies/:id`                            | Single anomaly + evidence + AI  |
| POST   | `/ai/analyze`                               | Run the deterministic engine     |
| POST   | `/anomalies/:id/explanation`               | Generate AI explanation         |
| POST   | `/meters/:meterId/anomalies/explanations`  | Generate explanations for a meter |

---

## 9. Tests, build, lint, typecheck

Backend (`ai-energy-platform-api/`):

```bash
npm test            # unit tests (24 suites, 94 cases)
npm run test:e2e    # HTTP e2e (5 suites, 32 cases) — requires DB + seed
npm run build       # nest build → dist/
npm run lint        # eslint
npx tsc --noEmit    # typecheck
```

Frontend (`ai-energy-platform-app/`):

```bash
npm test            # Jest component tests (5 suites, 14 cases)
npm run build       # next build
npm run lint        # next lint
npx tsc --noEmit    # typecheck
```

Acceptance tests against the real database are part of the backend unit
suite (`src/modules/{analytics,ai-analysis}/__tests__/acceptance/`) and
exercise the deterministic engine end-to-end. They require the seed to be
run first.

---

## 10. Analytics pipeline

The deterministic anomaly engine runs entirely on the backend. No LLM is
involved in detection. Full description in [`docs/analytics.md`](docs/analytics.md).

```
Readings
  -> DataValidation           (schema + numeric ranges per CSV)
  -> BaselineCalculator       (global mean + per-hour-of-day, pre-event)
  -> SpikeDetector            (z-score > 3 against baseline std)
  -> PersistentDeviationDetector (longest contiguous run with hourly
                                    deviation >= 20% vs hour baseline)
  -> OutlierDetector          (voltage, power factor, current outside bands)
  -> ElectricalConsistencyChecker  (V*I*PF / kWh ratio drift)
  -> DataQualityAnalyzer      (weighted score; >= 0.5 -> DATA_QUALITY)
  -> EventCorrelator          (matches an operational event within the window)
  -> AnomalyClassifier        (deterministic rules per AGENTS.md §9)
  -> SeverityCalculator       (HIGH / MEDIUM / LOW from type + deviation)
  -> ConfidenceCalculator     (base 0.5 + bonuses from sustained / electrical / event / sample-size)
  -> PriorityCalculator       (severity, upgraded by confidence)
  -> AIService                (render explanation; never alters verdict)
  -> PrismaAnomalyRepository  (persist)
```

Thresholds live in `src/shared/constants/analytics.constants.ts`.

---

## 11. Anomaly types and severity rules

Categories:

| Type             | Meaning                                                       |
|------------------|---------------------------------------------------------------|
| `REAL_ANOMALY`   | Real anomaly without an explaining operational event         |
| `EXPLAINABLE`    | Real anomaly that coincides with a known operational event   |
| `FALSE_POSITIVE` | Statistical deviation caused by a known benign event         |
| `DATA_QUALITY`   | Consumption looks fine but electrical readings are unreliable |
| `NORMAL`         | Nothing flagged                                               |

Severity is derived deterministically from the type and the deviation
percentage:

- `DATA_QUALITY` &rarr; HIGH
- `REAL_ANOMALY` &rarr; HIGH if `|deviation| > 50%`, MEDIUM if `> 20%`, LOW otherwise
- `EXPLAINABLE` &rarr; MEDIUM if `deviation > 30%` and `≤ 75%`, LOW otherwise
- `FALSE_POSITIVE` &rarr; LOW
- `NORMAL` &rarr; LOW

Priority = severity, upgraded to HIGH when confidence ≥ 0.85.

---

## 12. AI explainability

The deterministic engine is the **single source of truth** for `type`,
`severity`, `priority`, `confidence` and `evidence`. The AI layer only
renders the structured evidence into natural language and a recommended
action.

- The `IAiExplanationProvider` port lives in `modules/ai-analysis/domain/`.
- The default implementation is `StubAiExplanationProvider`
  (`modules/ai-analysis/infrastructure/`). It is fully deterministic and
  reads **only** the values present in the input evidence.
- The AI column on the `anomaly` table (`ai_explanation`, `recommended_action`)
  is updated only by the AI layer. The classification columns are never
  modified.

A future OpenAI provider can be bound to the same `AI_EXPLANATION_PROVIDER`
token without touching the analytics engine. **This MVP does NOT include an
OpenAI SDK** — only the deterministic stub.

See [`docs/ai-explainability.md`](docs/ai-explainability.md) for the full
contract.

---

## 13. Critical cases

The acceptance tests against the real database assert these classifications
and severities (AGENTS.md §10):

| Meter | type           | severity | priority | Why                                       |
|-------|----------------|----------|----------|-------------------------------------------|
| M-104 | EXPLAINABLE    | MEDIUM   | MEDIUM   | Consumption rises after `OPERATIONAL_CHANGE` (new production line) |
| M-106 | FALSE_POSITIVE | LOW      | LOW      | 12 h drop matches the `SCHEDULED_OUTAGE` window |
| M-109 | REAL_ANOMALY   | HIGH     | HIGH     | +112 % sustained jump without an operational event; electrical ratios shifted |
| M-112 | DATA_QUALITY   | HIGH     | HIGH     | Consumption stable; voltage / PF / electrical-ratio outliers |

The 8 remaining meters (`M-101..M-108, M-110, M-111`) are classified as
`NORMAL` and do **not** produce anomaly rows. They are checked by
`normal-meters.spec.ts`.

---

## 14. Dataset safety

- The dataset files in `data/` are the **only** source of truth for the
  classification logic. The deterministic engine never reads any other
  file.
- The file `expected_results.csv` (if present on the evaluator's local
  machine) **does not exist in this repository**, is **never read**, and
  is **not part of the solution**. It is reserved for evaluator validation
  only (AGENTS.md §7).
- Both `data/expected_results.csv` and `/expected_results.csv` are listed
  in `.gitignore` defensively.

---

## 15. Ports cheat sheet

| Service     | Default port | Override                         |
|-------------|--------------|----------------------------------|
| Backend     | 3000         | `PORT=` in `ai-energy-platform-api/.env` |
| Frontend    | 3001         | `next.config.js` + scripts in `package.json` |
| PostgreSQL  | 5432         | Standard Postgres configuration |

The frontend is configured to run on **3001** by default so that the
backend (3000) and frontend (3001) can coexist without port collisions on
the same machine.
