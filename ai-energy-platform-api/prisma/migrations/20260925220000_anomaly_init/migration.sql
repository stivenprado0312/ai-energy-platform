-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "meter_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "window_start" TIMESTAMP(0) NOT NULL,
    "window_end" TIMESTAMP(0) NOT NULL,
    "baseline_kwh" DOUBLE PRECISION NOT NULL,
    "observed_kwh" DOUBLE PRECISION NOT NULL,
    "deviation_percent" DOUBLE PRECISION NOT NULL,
    "related_event_id" TEXT,
    "evidence" JSONB NOT NULL,
    "ai_explanation" TEXT,
    "recommended_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anomalies_meter_id_type_priority_idx" ON "anomalies"("meter_id", "type", "priority");

-- CreateIndex
CREATE INDEX "anomalies_detected_at_idx" ON "anomalies"("detected_at");

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_related_event_id_fkey" FOREIGN KEY ("related_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

