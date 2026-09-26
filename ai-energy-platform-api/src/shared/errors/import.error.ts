import { DomainError } from './domain.error';

export class ImportError extends DomainError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 'IMPORT_ERROR', 422);
  }
}
