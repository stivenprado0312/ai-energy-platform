export interface ReadingResponse {
  id: string;
  meterId: string;
  timestamp: string;
  consumptionKwh: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  status: string;
}
