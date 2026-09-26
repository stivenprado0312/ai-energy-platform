# REST API reference

The backend exposes the following endpoints. The contract below mirrors
the actual DTOs and controllers in
`ai-energy-platform-api/src/modules/**/dto/` and `*.controller.ts`.

Base URL: `http://localhost:3000` by default (configurable via `PORT` in
the backend `.env`).

All error responses use the same envelope:

```json
{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "..." }
```

The `code` is one of `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`,
or the HTTP status family (e.g. `BAD_REQUEST`).

---

## Dashboard

### `GET /dashboard/summary`

Returns the KPIs shown on the operations dashboard.

- **Parameters**: none
- **Response 200**

```json
{
  "totalMeters": 12,
  "totalConsumptionKwh": 155250.85,
  "totalAnomalies": 4,
  "highPriorityAnomalies": 2,
  "lastReadingAt": "2026-09-14T23:00:00.000Z",
  "analysisStatus": "READY",
  "periodStart": "2026-09-01T00:00:00.000Z",
  "periodEnd": "2026-09-14T23:00:00.000Z"
}
```

- `analysisStatus` is `NOT_RUN`, `READY`, or legacy `PENDING_PHASE_2`.

---

## Meters

### `GET /meters`

Returns the 12 meters with reading and event counts. Used by the
dashboard meter grid and the `/meters` table.

- **Parameters**: none
- **Response 200**

```json
[
  { "code": "M-101", "status": "ACTIVE", "readingsCount": 336, "eventsCount": 0 },
  { "code": "M-109", "status": "ACTIVE", "readingsCount": 336, "eventsCount": 1 }
]
```

### `GET /meters/:meterId`

Returns the meter detail plus its consumption summary.

- **Path**: `meterId` — the meter code (e.g. `M-109`). Format validated
  with `/^M-\d{3}$/`.
- **Response 200**

```json
{
  "code": "M-109",
  "status": "ACTIVE",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "summary": {
    "totalKwh": 12144.5,
    "averageKwh": 43.7,
    "minKwh": 28.7,
    "maxKwh": 55.6,
    "readingsCount": 336,
    "firstTimestamp": "2026-09-01T00:00:00.000Z",
    "lastTimestamp": "2026-09-14T23:00:00.000Z"
  },
  "eventsCount": 1
}
```

- **Errors**: `400` if `meterId` does not match `M-\d{3}`; `404` if the
  meter does not exist.

### `GET /meters/:meterId/readings`

Returns hourly readings for a meter, sorted ascending by timestamp.

- **Path**: `meterId` — same format validation as above.
- **Query**:

  | Name    | Type   | Default | Notes                                                  |
  |---------|--------|---------|--------------------------------------------------------|
  | `from`  | ISO 8601 date-time | — | Optional. Inclusive lower bound on `timestamp`.    |
  | `to`    | ISO 8601 date-time | — | Optional. Inclusive upper bound on `timestamp`.    |
  | `limit` | int    | (no limit) | Optional. Min 1, max 5000. Validated by class-validator. |

- **Response 200**: array of readings
  ```json
  [
    {
      "id": "1",
      "meterId": "M-109",
      "timestamp": "2026-09-01T00:00:00.000Z",
      "consumptionKwh": 32.91,
      "voltageV": 219.61,
      "currentA": 192.9,
      "powerFactor": 0.938,
      "status": "OK"
    }
  ]
  ```
- **Errors**: `400` for malformed `meterId`; `404` if the meter does not
  exist.

### `GET /meters/:meterId/anomalies`

Returns the anomaly list for a single meter (no body, no body validation
needed). Same response shape as `GET /anomalies` (see below).

- **Errors**: `400` for malformed `meterId`.

---

## Anomalies

### `GET /anomalies`

Lists anomalies. Each result omits the full `evidence` object — fetch
`/anomalies/:id` to get it.

- **Query**:

  | Name       | Allowed values                                                  |
  |------------|----------------------------------------------------------------|
  | `meterId`  | `M-XXX`                                                        |
  | `type`     | `REAL_ANOMALY`, `EXPLAINABLE`, `FALSE_POSITIVE`, `DATA_QUALITY`, `NORMAL` |
  | `severity` | `HIGH`, `MEDIUM`, `LOW`                                        |
  | `priority` | `HIGH`, `MEDIUM`, `LOW`                                        |

- **Response 200**: array of `AnomalyListItem`:
  ```json
  [
    {
      "id": "cmuh...",
      "meterId": "M-109",
      "type": "REAL_ANOMALY",
      "severity": "HIGH",
      "confidence": 1,
      "priority": "HIGH",
      "detectedAt": "2026-09-12T14:00:00.000Z",
      "windowStart": "2026-09-12T14:00:00.000Z",
      "windowEnd": "2026-09-14T23:00:00.000Z",
      "baselineKwh": 43.69,
      "observedKwh": 92.77,
      "deviationPercent": 112.35,
      "relatedEventId": null
    }
  ]
  ```
- **Errors**: `400` for any unknown filter value.

### `GET /anomalies/summary`

Returns aggregate counts.

```json
{
  "total": 4,
  "byType":     { "REAL_ANOMALY": 1, "EXPLAINABLE": 1, "FALSE_POSITIVE": 1, "DATA_QUALITY": 1 },
  "bySeverity": { "HIGH": 2, "MEDIUM": 1, "LOW": 1 },
  "byPriority": { "HIGH": 2, "MEDIUM": 1, "LOW": 1 }
}
```

### `GET /anomalies/:id`

Returns the full anomaly including `evidence` (structured analytics
output) and the AI columns when populated.

- **Response 200**: `AnomalyDetail` (see `analytics/dto/anomaly-response.dto.ts`):
  ```json
  {
    "id": "cmuh...",
    "meterId": "M-109",
    "type": "REAL_ANOMALY",
    "severity": "HIGH",
    "confidence": 1,
    "priority": "HIGH",
    "detectedAt": "...",
    "windowStart": "...",
    "windowEnd": "...",
    "baselineKwh": 43.69,
    "observedKwh": 92.77,
    "deviationPercent": 112.35,
    "relatedEventId": null,
    "evidence": { "meterId": "M-109", "baseline": {...}, "deviation": {...}, "consistency": {...}, "dataQuality": {...}, "matchedEvent": null, "..." },
    "aiExplanation": "SUMMARY: ...\nWHY IT MATTERS: ...\nEVIDENCE:\n- ...\nRECOMMENDED ACTION: ...",
    "recommendedAction": "Prioritise on-site inspection of the meter and the associated load..."
  }
  ```
- **Errors**: `404` if the anomaly does not exist.

---

## AI analysis

### `POST /ai/analyze`

Runs the deterministic engine. By default persists the resulting
anomaly rows (`anomalies` table). When `explain: true`, also generates an
AI explanation for each persisted anomaly.

- **Body**

  ```json
  {
    "meterId": "M-109",       // optional: scope to a single meter
    "persist": true,          // optional, default true
    "explain": true           // optional, default false
  }
  ```

- **Response 201**
  ```json
  {
    "status": "DONE",
    "anomalies": [ /* AnomalyListItem[] for the meters analysed in this call */ ],
    "skippedMeters": 8,        // meters that produced no anomaly (NORMAL)
    "analyzedMeters": 12,
    "explanationsGenerated": 4
  }
  ```
  When `meterId` is provided, `analyzedMeters` is 1 and `anomalies`
  contains either the single anomaly or an empty array.

- **Errors**: `400` if `meterId` does not match `M-\d{3}`.

### `POST /anomalies/:id/explanation`

Generates the AI explanation for an existing anomaly and persists it.

- **Body**: ignored (`{ }` is fine).
- **Response 201**

  ```json
  {
    "anomalyId": "cmuh...",
    "meterId": "M-109",
    "anomalyType": "REAL_ANOMALY",
    "severity": "HIGH",
    "priority": "HIGH",
    "confidence": 1,
    "summary": "Real anomaly on meter M-109 - severity HIGH (deviation +110.0%).",
    "whyItMatters": "No operational event in the dataset accounts for the change...",
    "evidence": [
      "Baseline mean: 43.69 kWh (sample size 278).",
      "Deviation window: 58 h, observed mean 92.77 kWh vs baseline 43.69 kWh (+112.4%).",
      "Electrical ratio (V*I*PF / kWh) is shifted (mean 0.72).",
      "No operational event from the dataset coincides with the deviation."
    ],
    "recommendation": "Prioritise on-site inspection of the meter and the associated load. Validate electrical conditions...",
    "generatedAt": "2026-09-12T14:00:00.000Z"
  }
  ```

- **Errors**: `404` if the anomaly does not exist.

### `POST /meters/:meterId/anomalies/explanations`

Generates the AI explanation for every anomaly of the meter.

- **Body**: ignored.
- **Response 201**

  ```json
  {
    "meterId": "M-104",
    "generated": 1,
    "failed": 0,
    "results": [ /* AiExplanationResponse[] */ ]
  }
  ```

- **Errors**: `400` for malformed `meterId`; `404` if the meter does not
  exist.

---

## Common error codes

| Status | `code`           | When                                                     |
|--------|------------------|----------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | DTO / path validation failed (class-validator)         |
| 400    | `BAD_REQUEST`    | Generic 400 (rare; reserved)                             |
| 404    | `NOT_FOUND`      | Meter, reading endpoint, anomaly, or explanation missing |
| 500    | `INTERNAL_ERROR` | Unhandled exception (logged with stack trace)            |
