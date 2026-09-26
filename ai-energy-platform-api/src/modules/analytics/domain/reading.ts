// Reading: pure domain type used across the analytics pipeline.
// Matches the prisma reading table but free of Prisma decorators.
export interface Reading {
  id: string;
  meterId: string;
  timestamp: Date;
  consumptionKwh: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  status: string;
}

export interface MeterEvent {
  id: string;
  meterId: string;
  timestamp: Date;
  type: string;
  description: string;
}
