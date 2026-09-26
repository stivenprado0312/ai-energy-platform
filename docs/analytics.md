# Analytics pipeline

The deterministic anomaly engine turns raw meter readings into structured
evidence, a classification, a severity and a priority. It does not depend
on any LLM, randomness, or external service. The pipeline is a sequence
of pure functions over typed data structures.

## Source of truth

The pipeline lives under
`ai-energy-platform-api/src/modules/analytics/`:

```
analytics/
├── analytics.service.ts                  application orchestrator
├── analytics.tokens.ts                    METER_*_REPOSITORY tokens
├── analytics.controller.ts               HTTP layer (thin)
├── anomalies.service.ts                  list / get / summary
├── domain/
│   ├── anomaly.ts                        AnomalyResult
│   ├── evidence.types.ts                 Baseline, Deviation, Outlier, Evidence, ports
│   └── reading.ts                        Reading / MeterEvent value types
├── infrastructure/
│   ├── prisma-meter-reading.repository.ts
│   ├── prisma-event.repository.ts
│   └── prisma-anomaly.repository.ts
├── components/                           PURE FUNCTIONS
│   ├── baseline.calculator.ts
│   ├── spike.detector.ts
│   ├── persistent-deviation.detector.ts
│   ├── outlier.detector.ts
│   ├── electrical-consistency.checker.ts
│   ├── data-quality.analyzer.ts
│   ├── event-correlator.ts
│   └── anomaly-classifier.ts              Classifier + Severity + Confidence + Priority
└── __tests__/acceptance/                  DB-backed acceptance tests
```

Components are imported and orchestrated by `AnalyticsService`. The
orchestrator is the only place that touches the database.

## Pipeline stages

```
Readings + Event
   |
   v
[1] BaselineCalculator                per-hour-of-day mean + global mean/std
   |
   v
[2] SpikeDetector                     z-score > 3 against baseline std
   |
   v
[3] PersistentDeviationDetector       longest contiguous run with
   |                                  |hourly deviation| >= 20% vs
   |                                  the matching hour-of-day baseline
   v
[4] OutlierDetector                   voltage outside [210, 230] V,
   |                                  PF < 0.85, current outside [1, 600] A
   v
[5] ElectricalConsistencyChecker      ratio = (V*I*PF / 1000) / kWh
   |                                  noisy if std > 0.10, shifted if mean
   |                                  leaves [0.75, 1.25]
   v
[6] DataQualityAnalyzer               weighted score in [0, 1]
   |                                  >= 0.5 -> DATA_QUALITY (overrides)
   v
[7] EventCorrelator                   finds operational event inside the
   |                                  deviation window
   v
[8] AnomalyClassifier                 deterministic rules (see below)
   v
[9] SeverityCalculator                HIGH / MEDIUM / LOW
   v
[10] ConfidenceCalculator             base 0.5 + bonuses
   v
[11] PriorityCalculator                severity, bumped to HIGH if conf >= 0.85
   v
[12] AI explanation                   render text only (see ai-explainability.md)
   v
[13] PrismaAnomalyRepository.create    persist
```

## Component contracts (real signatures)

All thresholds live in `src/shared/constants/analytics.constants.ts`.
Every component takes typed inputs and returns typed outputs. None of
them depends on NestJS or Prisma.

```ts
class BaselineCalculator {
  compute(readings: Reading[], eventTimestamp: Date | null): Baseline | null;
  candidateWindowStart(readings: Reading[], eventTimestamp: Date | null): Date | null;
}

class SpikeDetector {
  detect(readings: Reading[], baseline: Baseline, zThreshold?: number): Spike[];
}

class PersistentDeviationDetector {
  detect(input: { readings, candidateStart, baseline, spikes }): DeviationWindow | null;
}

class OutlierDetector {
  detect(readings: Reading[]): OutlierCounters;
}

class ElectricalConsistencyChecker {
  check(readings: Reading[]): ConsistencyReport;
}

class DataQualityAnalyzer {
  analyze({ readingsCount, outliers, consistency }): DataQualityReport;
}

class EventCorrelator {
  correlate(events: MeterEvent[], windowStart: string, windowEnd: string): MatchedEvent | null;
}
```

`AnomalyClassifier`, `SeverityCalculator`, `ConfidenceCalculator` and
`PriorityCalculator` are colocated in
`analytics/components/anomaly-classifier.ts`.

## Classification rules

The classifier takes the evidence and emits one `AnomalyType`:

```
1. dataQuality.score >= DATA_QUALITY_THRESHOLD (0.5)
   -> DATA_QUALITY

2. matchedEvent.type === 'OPERATIONAL_CHANGE' -> EXPLAINABLE
3. matchedEvent.type === 'SCHEDULED_OUTAGE'   -> FALSE_POSITIVE
4. matchedEvent.type === 'DATA_QUALITY'       -> DATA_QUALITY
5. matchedEvent.type === 'UNKNOWN'            -> (fall through, treated as no explanation)
6. deviation present and no rule fired       -> REAL_ANOMALY
7. otherwise                                 -> NORMAL
```

Rule 5 is the M-109 path: events.csv declares the event as `UNKNOWN`,
which the classifier treats as "no operational explanation", routing the
deviation to `REAL_ANOMALY`.

## Severity rules

```
DATA_QUALITY                        -> HIGH
REAL_ANOMALY, |deviation| > 50%     -> HIGH
REAL_ANOMALY, 20% < |deviation|<=50% -> MEDIUM
REAL_ANOMALY, |deviation| <= 20%    -> LOW
EXPLAINABLE, 30% < deviation <= 75% -> MEDIUM
EXPLAINABLE, otherwise              -> LOW
FALSE_POSITIVE                      -> LOW
NORMAL                              -> LOW
```

## Confidence rules

```
baseConfidence = 0.5

+ 0.15  if sustained deviation window (>= 12 h)
+ 0.15  if electrical-consistency signal is significant (noisy or shifted)
+ 0.10  if type === REAL_ANOMALY AND no operational event matches
+ 0.10  if baseline sample size >= 100

confidence = clamp(base + bonuses, 0, 1)
```

## Priority rules

```
priority = severity
priority = HIGH  if (severity in {HIGH, MEDIUM}) AND confidence >= 0.85
```

The acceptance tests verify that M-109 ends up with priority HIGH by
this rule (severity HIGH + confidence 1.0).

## Determinism

The pipeline is deterministic: identical inputs produce identical
evidence. Two runs on the same dataset produce byte-identical outputs.
This is a hard requirement (AGENTS.md §11) and is verified by the
acceptance test suite against the real database.

## Thresholds (initial values)

All thresholds live in `analytics.constants.ts`. They are derived from
the dataset itself (`docs/data-analysis.md`) and can be tuned without
changing any other code.

| Key                              | Value | Meaning |
|----------------------------------|-------|---------|
| `MIN_BASELINE_SAMPLES`           | 24    | Minimum samples to compute a baseline |
| `DEVIATION_THRESHOLD_EXPLAINABLE`| 20%   | Hourly deviation that counts as "sustained" |
| `MIN_DEVIATION_HOURS`            | 6     | Minimum run length for a deviation window |
| `REAL_ANOMALY_HIGH_DEVIATION_PCT`| 50%   | HIGH threshold for REAL_ANOMALY |
| `EXPLAINABLE_HIGH_DEVIATION_PCT`  | 75%   | HIGH threshold for EXPLAINABLE |
| `EXPLAINABLE_MEDIUM_DEVIATION_PCT`| 30%   | MEDIUM threshold for EXPLAINABLE |
| `NOMINAL_VOLTAGE_MIN/MAX`        | 210/230 V | Outlier band for voltage |
| `NOMINAL_PF_MIN`                 | 0.85  | Outlier threshold for power factor |
| `ELECTRICAL_RATIO_TOLERANCE`     | 0.25  | Acceptable drift of V*I*PF/kWh |
| `DATA_QUALITY_THRESHOLD`         | 0.5   | Score above which DATA_QUALITY wins |
| `CONFIDENCE_SUSTAINED_HOURS`      | 12    | Bonus threshold for sustained deviation |

## Tests

- **Pure unit tests** in `analytics/components/*.spec.ts` cover every
  component in isolation, including the four critical-case shapes.
- **Acceptance tests** in `analytics/__tests__/acceptance/` run the full
  pipeline against the real database and assert the type + severity for
  M-104 / M-106 / M-109 / M-112 (and verify that the 8 normal meters
  produce no anomaly record).
