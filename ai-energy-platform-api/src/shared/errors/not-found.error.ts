import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`, 'NOT_FOUND', 404);
  }
}
