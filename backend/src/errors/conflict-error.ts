import { ApiError } from './ApiError';

export class ConflictError extends ApiError {
  constructor(message: string = 'Конфликт данных') {
    super(message, 409);
  }
}
