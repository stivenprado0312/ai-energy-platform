import { DomainError } from './domain.error';

export class ValidationError extends DomainError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
