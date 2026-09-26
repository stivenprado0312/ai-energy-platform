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
