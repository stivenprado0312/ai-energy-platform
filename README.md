# AI Energy Platform

Technical challenge MVP for electrical energy monitoring and anomaly management.

The platform ingests hourly electrical meter readings, detects anomalous
behavior, explains why an anomaly was flagged, prioritizes it, and recommends
an action.

Core business flow:

```
DATA -> ANALYSIS -> ANOMALY -> EXPLANATION -> PRIORITIZATION -> ACTION
```

## Repository structure (current state: Phase 0)

```
ai-energy-platform/
|-- AGENTS.md                       Agent instructions (source of truth)
|-- README.md                       This file
|-- .env.example                    Example environment variables
|-- .gitignore
|-- data/
|   |-- readings.csv                4,032 hourly readings, 12 meters, 14 days
|   `-- events.csv                  4 operational events
|-- docs/
|   |-- data-analysis.md            Dataset analysis (real findings)
|   `-- implementation-plan.md      Technical implementation plan
|-- ai-energy-platform-api/         Backend (NestJS) — to be initialized in Phase 1
|-- ai-energy-platform-app/         Frontend (Next.js) — to be initialized in Phase 4
`-- .opencode/                      OpenCode configuration — populated as needed
```

## Stack

* Backend: NestJS, TypeScript, Prisma, PostgreSQL (local, no Docker)
* Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Recharts
* AI: `ILLMProvider` abstraction; default is `StubDeterministicProvider`
* Tests: Jest

## Current development phase

**Phase 0 — Project setup** — completed.

This commit only sets up the directory layout, copies the dataset into
`data/`, and writes the foundational documentation. NestJS, Next.js, and
all functional code will be added in subsequent phases.

## Setup (to be expanded in later phases)

1. Copy `.env.example` to `.env` and adjust `DATABASE_URL` to point to your
   local PostgreSQL instance.
2. Ensure PostgreSQL is running locally and the database exists.
3. Run the NestJS API (Phase 1+):
   ```bash
   cd ai-energy-platform-api
   npm install
   npx prisma migrate dev
   npm run seed
   npm run start:dev
   ```
4. Run the Next.js frontend (Phase 4+):
   ```bash
   cd ai-energy-platform-app
   npm install
   npm run dev
   ```

The instructions above describe the **intended** workflow. The actual
commands will become available as Phase 1 and Phase 4 are implemented.

## Safety constraints

* The dataset file `expected_results.csv` must never be read, copied,
  referenced, or committed. It is reserved for evaluator validation only.
* The `.env` file must never be committed.
* Real API keys must never be placed in source code.
