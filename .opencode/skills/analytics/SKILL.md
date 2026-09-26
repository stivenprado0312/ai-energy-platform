---
name: analytics
description: Analytics and evidence rules for the AI Energy Platform. Applied automatically when designing or modifying the analytics pipeline (baseline, spike, persistent deviation, outlier, electrical consistency, data quality, event correlation) under ai-energy-platform-api/src/modules/analytics/. Complements AGENTS.md § 11, § 13, § 14 with file-level patterns.
---

# Analytics Skill — AI Energy Platform

This skill is the **operational checklist** for the analytics pipeline. It
complements `AGENTS.md` § 11–§ 20 with concrete rules for components,
evidence shape, and determinism.

## 1. Determinism is mandatory

The analytics engine is the **single source of truth** for anomaly
evidence. It is **deterministic** and **testable**.

- No `Date.now()`, no `Math.random()`, no environment reads beyond the
  configured thresholds and the input data.
- No LLM participates in computing evidence (AGENTS.md § 11, § 21).
- Two runs on the same dataset MUST produce byte-identical evidence
  objects. Tests assert this property.

## 2. Pipeline shape

The pipeline is the sequence defined in AGENTS.md § 11. Every stage is
a small, single-responsibility class located under
`src/modules/analytics/components/`:

```
BaselineCalculator          → Baseline
SpikeDetector               → Spike[]
PersistentDeviationDetector → DeviationWindow[]
OutlierDetector             → Outlier[]
ElectricalConsistencyChecker → ConsistencyReport
DataQualityAnalyzer         → DataQualityReport
EventCorrelator             → EventMatch[]
```

Each component is a **pure function** over the data it receives. It does
not touch the database and does not know about Prisma, NestJS, or HTTP.
The orchestrator (`AnalyticsService`) wires repositories and components.

## 3. Layering

- `components/` — pure logic. No `@Injectable()`, no `@Controller()`, no
  Prisma imports. Unit tests instantiate with `new X()`.
- `domain/` — pure types, evidence shapes, port interfaces
  (`MeterReadingRepository`, `MeterEventRepository`).
- `infrastructure/` — Prisma implementations of the ports.
- `analytics.service.ts` — application orchestrator.
- `analytics.controller.ts`, `dto/` — presentation.

The architecture skill's "domain never imports from infrastructure" rule
applies in full here.

## 4. Thresholds

All thresholds live in `src/shared/constants/analytics.constants.ts`.
- They are derived from the dataset (see `docs/data-analysis.md`), not
  from `expected_results.csv` (AGENTS.md § 7).
- The constants file declares **ranges and defaults**, never exact
  per-meter values.
- Tests reference the constants by name, not by literal.

## 5. Evidence shape

Every output of the analytics pipeline is a **structured, JSON-serializable
object** persisted in the `Anomaly.evidence` column. The shape is
declared in `src/modules/analytics/domain/evidence.types.ts`.

The evidence must answer:

- What was the baseline? (mean, std, sample size, source window)
- Was there a sustained deviation? (window, observed, deviation %, max
  z-score, spike count)
- Were there electrical anomalies? (outlier counts, consistency ratio)
- Was there a related operational event? (id, type, timestamp,
  description)
- How strong is each signal? (per-signal flags + a derived confidence)

The future `StubDeterministicProvider` (Phase 3) renders this evidence
into prose; it MUST NOT recompute or invent values.

## 6. Baseline

Baseline = behaviour of the meter **before** the candidate event window.

For each meter:
1. If the meter has a recorded operational event, the pre-event window
   is `min(timestamp)` … `event.timestamp - 1ms`.
2. If the meter has no event, the baseline window is the **first half**
   of the readings (split by timestamp at the median).
3. The baseline is a `Baseline { meanKwh, stdKwh, sampleSize,
   sourceWindowStart, sourceWindowEnd }`.

Why: this is robust whether or not the meter has an event and it never
leaks post-event data into the baseline.

## 7. Persistent deviation

The deviation detector finds the **longest contiguous run of hours**
within the candidate window where the **mean hourly deviation from the
baseline** exceeds `DEVIATION_THRESHOLD_EXPLAINABLE`.

- "Contiguous" = consecutive hours with no gap.
- The run's reported `deviationPct` is the run-mean vs baseline.
- `durationHours` is the number of hours in the run.
- A null run means "no significant deviation".

This algorithm satisfies the four critical cases from the data
analysis:

- M-104 → 96 h sustained positive deviation (~47 %).
- M-106 → 12 h sustained negative deviation during the outage (~85 %).
- M-109 → 58 h sustained positive deviation (~112 %).
- M-112 → no sustained deviation (consumption is stable).

## 8. Outlier detection

Outliers are **electrical reading outliers**, not consumption outliers:

- Voltage outside `[NOMINAL_VOLTAGE_MIN, NOMINAL_VOLTAGE_MAX]`.
- Power factor below `NOMINAL_PF_MIN`.
- Current more than `CURRENT_ZSCORE` standard deviations above its
  baseline mean.

These thresholds come from the dataset's own distribution
(`docs/data-analysis.md` § 5). They are deliberately narrow enough not to
flag normal meters.

## 9. Electrical consistency

For every reading, compute `ratio = (V · I · PF / 1000) / kWh`. The
ratio is ~0.95 in healthy data.

- Compute `ratioMean` and `ratioStd` per meter for the candidate
  window.
- Flag as "noisy" if the standard deviation of the ratio exceeds
  `ELECTRICAL_RATIO_NOISE_THRESHOLD`.
- Flag as "implausibly shifted" if `ratioMean` is outside
  `[1 - ELECTRICAL_RATIO_BIAS, 1 + ELECTRICAL_RATIO_BIAS]`.

The electrical consistency report feeds the data-quality analyzer; it
does not on its own classify an anomaly.

## 10. Data-quality analyzer

`dataQualityScore` is a deterministic 0..1 number built from:

- voltage outlier rate in the candidate window
- power-factor outlier rate
- electrical ratio noise

If the score exceeds `DATA_QUALITY_THRESHOLD`, the classifier emits
`DATA_QUALITY` and **overrides** any consumption-based classification.
This is what lets M-112 be detected even though its consumption is
stable.

## 11. Event correlation

`EventCorrelator` finds an event for the same meter whose timestamp
falls inside `[windowStart, windowEnd]`. If multiple events match, the
earliest one wins.

The event type drives the classification together with the deviation
result. The mapping lives in `AnomalyClassifier`.

## 12. Test discipline (analytics-specific)

- Pure components have unit tests with **synthetic in-memory data**
  (handcrafted arrays, not the database).
- At least one **integration test** runs the full
  `AnalyticsService.analyzeMeter()` pipeline against the real PostgreSQL
  dataset.
- Four **acceptance tests** under
  `src/modules/analytics/__tests__/acceptance/` assert the expected
  `type` and `severity` of M-104, M-106, M-109, M-112. They assert
  **only** category and severity — never numerical thresholds.
- Tests MUST NOT reference `expected_results.csv`. AGENTS.md § 7 is
  enforced by convention.

## 13. Definition of done (analytics component)

A change is "done" only when:

1. The component is a pure function (no I/O, no DI decorators, no
   Prisma).
2. Every threshold used is a named constant.
3. The output is a JSON-serializable type declared in `domain/`.
4. Unit tests cover: empty input, normal input, the four critical-case
   shapes, and at least one error boundary.
5. The integration test against the real dataset still produces the
   same byte-identical evidence (determinism).
