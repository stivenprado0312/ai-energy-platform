// Injection tokens for analytics ports. Using a Symbol keeps the
// dependency graph explicit and prevents accidental collisions with
// providers from other modules.
export const METER_READING_REPOSITORY = Symbol.for('METER_READING_REPOSITORY');
export const METER_EVENT_REPOSITORY = Symbol.for('METER_EVENT_REPOSITORY');
