export interface RawReadingRow {
  meter_id: string;
  timestamp: string;
  consumption_kwh: string;
  voltage_v: string;
  current_a: string;
  power_factor: string;
  status: string;
}

export interface RawEventRow {
  meter_id: string;
  timestamp: string;
  type: string;
  description: string;
}

export interface ValidatedReading {
  meterId: string;
  timestamp: Date;
  consumptionKwh: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  status: string;
}

export interface ValidatedEvent {
  meterId: string;
  timestamp: Date;
  type: string;
  description: string;
}

export interface ValidatedMeter {
  code: string;
}
