-- CreateTable
CREATE TABLE "meters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" BIGSERIAL NOT NULL,
    "meter_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(0) NOT NULL,
    "consumption_kwh" DOUBLE PRECISION NOT NULL,
    "voltage_v" DOUBLE PRECISION NOT NULL,
    "current_a" DOUBLE PRECISION NOT NULL,
    "power_factor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "meter_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(0) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meters_code_key" ON "meters"("code");

-- CreateIndex
CREATE INDEX "readings_meter_id_timestamp_idx" ON "readings"("meter_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "readings_meter_id_timestamp_key" ON "readings"("meter_id", "timestamp");

-- CreateIndex
CREATE INDEX "events_meter_id_timestamp_idx" ON "events"("meter_id", "timestamp");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

