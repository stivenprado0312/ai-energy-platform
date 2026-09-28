# AI Energy Platform — Agent Instructions

## 1. Project Overview

AI Energy Platform is a technical challenge MVP for electrical energy monitoring and anomaly management.

The company challenge document states that Go is the preferred language, but the company explicitly confirmed by email that the candidate may use the programming language of their preference.

For this project we will use:

* Node.js
* TypeScript
* NestJS
* Next.js
* PostgreSQL
* Prisma

Do NOT switch to Go.

The system must ingest and analyze electrical meter readings, detect anomalous behavior, explain why an anomaly was detected, prioritize it, and recommend an action.

The core business flow is:

DATA
→ ANALYSIS
→ ANOMALY
→ EXPLANATION
→ PRIORITIZATION
→ ACTION

The application must feel like a real SaaS energy-management platform, not like a technical test or data-science notebook.

---

# 2. Challenge Deadline

Deadline:

Sunday, September 27, 2026 at 10:00 PM.

The priority is to deliver a functional end-to-end MVP.

Avoid unnecessary complexity.

Do not spend time implementing infrastructure or features that do not contribute directly to the challenge evaluation or demo.

---

# 3. Challenge Scope

The platform manages:

* 12 electrical meters
* 14 days of readings
* 4,032 readings
* Consumption
* Voltage
* Current
* Power factor
* Operational events
* Baselines
* Outliers
* Anomalies
* Data quality
* AI explanations
* Severity
* Confidence
* Prioritization
* Recommended actions

The main demo flow is:

Login
→ Dashboard
→ Meter M-109
→ Run AI Analysis
→ Anomaly
→ Investigation
→ Explanation
→ Evidence
→ Recommended Action

---

# 4. Evaluation Priorities

The challenge evaluates:

* Frontend / UX
* Backend / API
* Data / Analytics
* Anomaly detection
* AI and explainability
* Testing
* Documentation
* Code quality

The most important functional scenarios are:

1. Detect M-109 as a real anomaly.
2. Prioritize M-109 as HIGH.
3. Do not classify M-106 as a real anomaly.
4. Detect M-112 as a data-quality problem.
5. Correctly interpret M-104 as an explainable anomaly.
6. Explain conclusions using evidence.
7. Recommend a coherent action.

---

# 5. Technology Stack

## Backend

* Node.js
* TypeScript
* NestJS
* Prisma
* PostgreSQL
* REST API
* Jest

## Frontend

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* Recharts

## Database

PostgreSQL installed and running locally.

DO NOT use Docker for PostgreSQL.

DO NOT create docker-compose for the database unless explicitly requested later.

Database connection must be configured through:

DATABASE_URL

Example:

DATABASE_URL=postgresql://user:password@localhost:5432/ai_energy_platform

Never hardcode credentials.

---

# 6. Repository Structure

The repository must use:

ai-energy-platform/
├── ai-energy-platform-api/
├── ai-energy-platform-app/
├── data/
│   ├── readings.csv
│   └── events.csv
├── docs/
├── .opencode/
├── AGENTS.md
├── .env.example
├── .gitignore
└── README.md

Backend:

ai-energy-platform-api/

Frontend:

ai-energy-platform-app/

Dataset:

data/

Documentation:

docs/

OpenCode configuration:

.opencode/

---

# 7. Dataset

The provided dataset contains:

data/readings.csv

data/events.csv

There may also be:

expected_results.csv

IMPORTANT:

NEVER use expected_results.csv.

NEVER copy expected_results.csv into the repository.

NEVER read expected_results.csv.

NEVER use expected_results.csv as an input to the application.

NEVER hardcode expected results from that file.

The application must independently calculate its classifications using the supplied readings and events.

The expected results are reserved for evaluator validation.

---

# 8. Dataset Facts

The actual dataset has been analyzed before implementation.

Known facts:

* 4,032 readings.
* 12 meters.
* 336 readings per meter.
* 14 days.
* Hourly readings.
* 4 operational events.
* Each meter contains 336 hourly readings.

Important meters:

M-104
M-106
M-109
M-112

The implementation must continue to use the actual dataset as the source of truth.

Do not invent dataset values.

---

# 9. Critical Business Cases

## M-104

The consumption increase coincides with a new production line.

Expected classification:

EXPLAINABLE

Expected severity:

MEDIUM

The system must correlate the consumption change with the known operational event.

This must not automatically be treated as a real operational anomaly.

---

## M-106

The consumption change is explained by a scheduled shutdown.

Expected classification:

FALSE_POSITIVE

Expected severity:

LOW

A statistical deviation alone must not automatically become a real anomaly.

Known operational events must be considered.

---

## M-109

M-109 contains the primary critical anomaly scenario.

The dataset shows a major consumption increase without a known operational event explaining it.

Electrical variables also change.

Expected classification:

REAL_ANOMALY

Expected severity:

HIGH

Expected priority:

HIGH

The system should provide evidence including, where applicable:

* baseline
* observed consumption
* deviation
* statistical evidence
* abrupt change
* electrical variable changes
* absence of related operational event

Do not hardcode the expected values.

Calculate them from the dataset.

---

## M-112

Consumption remains relatively stable while electrical readings show inconsistencies.

Expected classification:

DATA_QUALITY

Expected severity:

HIGH

The system must distinguish a data-quality problem from a consumption anomaly.

---

# 10. Acceptance Tests

Acceptance tests for the four critical meters must assert the exact category and exact severity.

Required expectations:

M-104
→ EXPLAINABLE
→ MEDIUM

M-106
→ FALSE_POSITIVE
→ LOW

M-109
→ REAL_ANOMALY
→ HIGH

M-112
→ DATA_QUALITY
→ HIGH

Do NOT assert exact numerical values such as:

* exact baseline
* exact z-score
* exact deviation percentage
* exact confidence

Numerical thresholds may evolve during implementation.

The critical classification and severity must remain stable.

Tests must use the real dataset.

---

# 11. Anomaly Detection Philosophy

The anomaly detection engine must be deterministic and testable.

Do NOT ask an LLM to inspect thousands of raw readings and independently decide whether anomalies exist.

The analytical engine must first calculate structured evidence.

Pipeline:

Readings
→ Data Validation
→ Baseline
→ Statistical Analysis
→ Spike Detection
→ Persistent Deviation
→ Outlier Detection
→ Electrical Consistency
→ Event Correlation
→ Anomaly Classification
→ Severity
→ Confidence
→ Priority
→ AI Explanation
→ Recommended Action

---

# 12. Analytics Components

Potential components:

BaselineCalculator

SpikeDetector

PersistentDeviationDetector

OutlierDetector

ElectricalConsistencyChecker

DataQualityAnalyzer

EventCorrelator

AnomalyClassifier

SeverityCalculator

ConfidenceCalculator

PriorityCalculator

Do not create unnecessary abstractions.

Each component should have one clear responsibility.

Prefer composition over giant services.

---

# 13. Baseline

Baseline calculation should be derived from the actual dataset.

Consider:

* historical readings
* hour-of-day behavior
* global statistics
* normal behavior

The implementation may use:

* hourly baseline
* global mean
* standard deviation
* other justified statistical measures

Do not assume a baseline method without validating it against the dataset.

---

# 14. Statistical Detection

Possible signals include:

* z-score
* spikes
* persistent deviations
* percentage deviation from baseline
* outliers
* abrupt changes
* temporal patterns

Thresholds must be configurable.

Do not scatter magic numbers throughout the code.

Prefer a centralized configuration such as:

src/shared/constants.ts

or a domain configuration object.

Thresholds must be validated against the real dataset.

---

# 15. Electrical Consistency

Analyze relationships between:

* consumption
* voltage
* current
* power factor

The system should be capable of identifying electrical inconsistencies independently from consumption anomalies.

This is especially important for M-112.

Do not blindly apply generic electrical thresholds if they create false positives.

Validate thresholds against the actual readings.

---

# 16. Event Correlation

Operational events are part of the anomaly interpretation.

A large consumption deviation with a related known operational event may be:

EXPLAINABLE

A large deviation without a related event may be:

REAL_ANOMALY

An operational event can also explain what initially looks like an anomaly.

The event correlation logic must consider:

* meter
* timestamp
* event type
* event description
* temporal proximity

Do not ignore events.

---

# 17. Anomaly Types

Use the following domain values:

REAL_ANOMALY

EXPLAINABLE

FALSE_POSITIVE

DATA_QUALITY

NORMAL

The four critical cases must produce the expected values defined above.

---

# 18. Severity

Use:

HIGH

MEDIUM

LOW

Severity must be calculated from evidence and business rules.

Do not determine severity solely from a single metric.

---

# 19. Priority

Use:

HIGH

MEDIUM

LOW

Priority should consider:

* severity
* confidence
* strength of evidence
* operational impact
* anomaly type

M-109 must be HIGH priority.

---

# 20. Confidence

Confidence must represent the strength and alignment of evidence.

It must NOT be a random number.

It must NOT be generated arbitrarily by an LLM.

Confidence should be based on deterministic analytical signals.

The exact numerical confidence values are not part of the acceptance assertions.

---

# 21. AI Architecture

AI explanation must be separated from anomaly detection.

The analytics engine produces evidence.

The AI explanation layer consumes that evidence.

Architecture:

Analytics
→ Evidence
→ Classification
→ Severity
→ Priority
→ AI Explanation
→ Recommendation

The LLM must NOT independently calculate or invent evidence.

---

# 22. LLM Provider Abstraction

Use an abstraction:

ILLMProvider

Conceptually:

interface ILLMProvider {
explain(input: LlmInput): Promise<LlmOutput>;
}

LlmInput should contain:

* meterId
* anomalyType
* severity
* evidence
* relatedEvent

LlmOutput should contain:

* summary
* reason
* recommendedAction
* confidenceNote

---

# 23. Default AI Provider

The default provider is:

StubDeterministicProvider

Configuration:

LLM_PROVIDER=stub

The stub must generate explanations from the actual evidence.

It must not invent values.

It must explicitly communicate uncertainty when evidence is insufficient.

---

# 24. Future OpenAI Provider

An OpenAI provider may be implemented behind the same ILLMProvider abstraction.

However:

DO NOT require an OpenAI API key for the MVP.

DO NOT make OpenAI mandatory.

DO NOT activate OpenAI by default.

The application must work fully with:

LLM_PROVIDER=stub

The OpenAI provider must be replaceable without changing:

* domain logic
* analytics
* anomaly classification
* persistence
* frontend

---

# 25. AI Explainability

AI explanations must answer:

What happened?

Why was it detected?

Which variables changed?

Was there a known event?

How strong is the evidence?

What is the severity?

What should be done?

The explanation must be traceable to structured evidence.

---

# 26. Backend Architecture

Use a modular monolith.

Suggested structure:

ai-energy-platform-api/
└── src/
├── modules/
│   ├── meters/
│   ├── readings/
│   ├── dashboard/
│   ├── analytics/
│   ├── anomalies/
│   └── ai-analysis/
│
├── infrastructure/
│   ├── database/
│   └── ai/
│
├── shared/
│
├── app.module.ts
└── main.ts

Use separation of responsibilities where useful:

* domain
* application
* infrastructure
* presentation

Do not create excessive layers for trivial functionality.

---

# 27. Database

Use PostgreSQL + Prisma.

Core entities:

Meter

Reading

Event

Anomaly

Analysis

Suggested relationships:

Meter
→ Readings

Meter
→ Events

Meter
→ Anomalies

Analysis
→ generated anomalies

Use proper:

* indexes
* unique constraints
* foreign keys
* timestamps

Use migrations.

---

# 28. API

Required functionality includes:

GET /meters

GET /meters/:meterId

GET /meters/:meterId/readings

GET /dashboard/summary

GET /anomalies

GET /anomalies/:id

POST /ai/analyze

GET /ai/analysis/:id

Endpoints may be adjusted if implementation reveals a cleaner REST design.

Controllers must remain thin.

Business logic must not live inside controllers.

---

# 29. Dashboard

The dashboard must display:

* total meters
* total consumption
* anomalies
* high-priority anomalies
* aggregated confidence
* last analysis timestamp
* analysis status

Meter table:

* meter ID
* consumption
* variation
* status
* anomaly
* severity

Filters:

* all
* normal
* alerts
* critical

Search:

* meter ID

Sorting:

* consumption
* variation
* severity

---

# 30. Meter Detail

The meter detail screen must display:

* current consumption
* baseline
* variation
* status
* consumption history
* voltage
* current
* power factor
* relevant events
* anomalies

Charts must help investigation.

Avoid decorative charts with no analytical value.

---

# 31. AI Analysis Flow

The main flow is:

POST /ai/analyze

The frontend must show a meaningful analysis state.

The trigger button **Run AI Analysis** must be reachable from at least:

* the Dashboard (global run)
* the Meter detail page (`/meters/:meterId`) for single-meter runs

Conceptual pipeline:

Readings
→ Baseline
→ Detection
→ Correlation
→ Events
→ Explanation
→ Recommendation

The response of `POST /ai/analyze` MUST include a `requiringAttention`
count (anomalies with HIGH severity or HIGH priority) so the UI can show
messages like `"4 anomalías detectadas · 2 requieren atención prioritaria"`.

Do not fake asynchronous progress.

If analysis is synchronous, communicate that honestly.

If analysis becomes asynchronous, persist and expose real status.

---

# 32. Investigation Screen

The investigation screen (`/anomalies/:id`) must visually separate the
**deterministic verdict** (computed by the analytics engine) from the
**AI explanation** (rendered by the StubDeterministic AI provider). The
evaluator must immediately see what the engine produced and what the AI
added.

The investigation screen must answer:

* What happened? (deterministic evidence: baseline, deviation, outliers)
* Why? (matched operational event, if any)
* What variables changed? (electrical consistency + outliers panel)
* Was there an event? (RelatedEventCard or "no event" panel)
* What is the severity? (badge)
* What is the confidence? (numeric)
* What evidence supports the conclusion? (EvidencePanel)
* What action is recommended? (RecommendationCard)

The `/anomalies` list view MUST include an "Acción" column that
summarises the recommended next step per anomaly
(Investigar / Validar operación / No escalar / Validar sensor).

---

# 33. Frontend Architecture

Use:

Next.js App Router

TypeScript

Tailwind CSS

Recharts

Required routes:

/login              ← entry point; mock form that accepts any input
                     and redirects to /dashboard. Mandatory because
                     the challenge's UX criterion lists it as step 1.
/dashboard
/meters
/meters/[meterId]   ← MUST have a "Run analysis" / "Run AI Analysis"
                     button so the user can execute the analysis from
                     the meter detail page (not only from the dashboard).
/anomalies
/anomalies/[id]
/ai                 ← optional landing page for the analysis flow

The primary demo path is:

/login
→ /dashboard
→ /meters/M-109
→ Run AI Analysis     ← must be reachable from M-109 detail page
→ /anomalies/M-109    (or list)
→ /anomalies/:id
→ Evidence + AI explanation + Recommended action

---

# 34. Frontend UX

The application must feel like a SaaS Energy Management product.

Prioritize:

* visual hierarchy
* readable data
* responsive layout
* loading states
* error states
* empty states
* clear severity indicators
* useful charts
* consistent components
* intuitive navigation

Avoid generic admin-template appearance.

---

# 35. Code Quality

Follow:

* SOLID
* Clean Code
* DRY
* KISS
* separation of concerns
* dependency inversion where useful
* explicit naming
* small cohesive functions
* typed interfaces
* DTO validation
* consistent error handling

Avoid:

* giant services
* business logic in controllers
* duplicated calculations
* magic numbers
* unnecessary abstractions
* unnecessary dependencies
* premature optimization

---

# 36. Testing

Use Jest.

Tests must cover:

* baseline
* variation
* spikes
* persistent deviations
* outliers
* electrical consistency
* data quality
* event correlation
* classification
* severity
* priority
* AI provider
* API behavior

Critical acceptance tests:

M-104 → EXPLAINABLE / MEDIUM

M-106 → FALSE_POSITIVE / LOW

M-109 → REAL_ANOMALY / HIGH

M-112 → DATA_QUALITY / HIGH

---

# 37. Development Workflow

Before modifying code:

1. Inspect the current project.
2. Understand the relevant module.
3. Check existing tests.
4. Identify the smallest coherent change.

After implementing:

1. Run relevant tests.
2. Run TypeScript checks.
3. Run lint when available.
4. Inspect errors.
5. Fix errors.
6. Review the diff.
7. Continue.

Do not rewrite working code unnecessarily.

---

# 38. AI Agent Behavior

Act as a senior software engineer.

Do not generate large amounts of code without understanding the current state.

Do not blindly follow a plan if the actual code or dataset contradicts it.

Use the actual repository and dataset as sources of truth.

When requirements are ambiguous:

1. inspect evidence
2. choose the simplest defensible solution
3. document the assumption
4. continue without unnecessary blocking

Do not ask for confirmation for every minor implementation decision.

Ask for confirmation only when a decision can materially affect architecture, scope, deadline, data integrity, or evaluation.

---

# 39. OpenCode Workflow

OpenCode is part of the development workflow.

The project may contain:

.opencode/
├── agents/
└── skills/

Agents and skills must help development, not become unnecessary complexity.

Potential specialized agents:

* architect
* data-analyst
* reviewer
* tester

Potential skills:

* backend
* frontend
* analytics
* anomaly-detection
* ai-explainability
* testing

Do not create all agents and skills blindly.

Create them when they provide clear value.

The main development agent remains responsible for coordinating implementation.

---

# 40. Agent Safety

Never:

* delete the dataset
* read expected_results.csv
* commit secrets
* expose API keys
* hardcode credentials
* modify production-like external systems
* push to remote repositories without explicit user authorization

Do not modify unrelated files.

Do not change technology stack without explicit authorization.

---

# 41. Environment Variables

Secrets and environment-specific configuration belong in:

.env

The repository must contain:

.env.example

Never commit:

.env

Never place real API keys in source code.

Required database configuration:

DATABASE_URL

Optional future AI configuration:

LLM_PROVIDER=stub

OPENAI_API_KEY=

The default must remain:

LLM_PROVIDER=stub

---

# 42. Git

Use meaningful commits when commits are requested.

Do not automatically push.

Before committing:

* inspect git diff
* run tests
* verify no secrets
* verify expected files only

Do not commit:

.env

node_modules

build artifacts

temporary files

expected_results.csv

---

# 43. Documentation

Maintain:

docs/data-analysis.md

docs/implementation-plan.md

README.md

Documentation should reflect the actual implementation.

Do not document functionality that does not exist.

Do not claim AI capabilities that are not implemented.

---

# 44. Current Development Phases

## Phase 0 — Project Setup

* repository structure
* dataset copied
* documentation
* .gitignore
* .env.example

## Phase 1 — Backend Foundation

* NestJS
* Prisma
* PostgreSQL
* schema
* migrations
* seed/import
* meters
* readings
* events
* dashboard

## Phase 2 — Analytics

* baseline
* spike detection
* persistent deviation
* outliers
* electrical consistency
* data quality
* event correlation
* classifier
* severity
* confidence
* priority
* tests

## Phase 3 — Anomalies and AI

* anomaly persistence
* analysis persistence
* ILLMProvider
* StubDeterministicProvider
* AI endpoints
* explanation
* recommendation

## Phase 4 — Frontend

* Next.js
* layout
* login mock
* dashboard
* meters
* meter detail
* charts

## Phase 5 — Investigation

* Run AI Analysis
* AI analysis state
* anomaly list
* investigation screen
* evidence
* recommendation

## Phase 6 — Finalization

* login mock
* Run AI Analysis button reachable from meter detail
* Acción column in anomalies list
* visual separation "deterministic verdict" vs "AI explanation" on
  the investigation screen
* `requiringAttention` counter in `POST /ai/analyze` response
* UX polish
* loading/error/empty states
* tests
* README
* smoke test
* demo preparation

---

# 45. Scope Priority

If time becomes limited:

## P0

* dataset ingestion
* backend
* analytics
* M-109
* dashboard
* meter detail
* AI explanation

## P1

* M-104
* M-106
* M-112
* anomaly list
* filters
* charts
* tests

## P2

* visual polish
* additional UX
* documentation improvements

Protect P0 functionality first.

---

# 46. Definition of Done

The MVP is complete when an evaluator can:

1. Start the application.
2. Access the application.
3. View the dashboard.
4. See the meters.
5. Open M-109.
6. Run AI Analysis.
7. See the detected anomaly.
8. See evidence.
9. Understand why it was detected.
10. See severity.
11. See confidence.
12. See the recommended action.
13. Navigate to other relevant anomalies.
14. Understand the difference between:

    * real anomaly
    * explainable anomaly
    * false positive
    * data quality issue

The complete system must work end-to-end using the supplied dataset.

---

# 47. First Task

When starting a new implementation phase, do not immediately generate the entire application.

First inspect:

* current repository
* AGENTS.md
* dataset
* existing documentation
* current implementation state

Then perform only the requested phase.

For the initial phase:

1. Create the required directories.
2. Copy readings.csv to data/readings.csv.
3. Copy events.csv to data/events.csv.
4. Create .gitignore.
5. Create .env.example.
6. Create/update docs/data-analysis.md.
7. Create/update docs/implementation-plan.md.
8. Verify the result.

Do NOT start Phase 1 until explicitly instructed.

---

# 48. Final Principle

Build the smallest clean system that convincingly demonstrates:

DATA
→ ANALYSIS
→ ANOMALY
→ EXPLANATION
→ PRIORITIZATION
→ ACTION

Correctness and explainability are more important than architectural complexity.

The evaluator must be able to understand the value of the product within a 5–10 minute demo.
