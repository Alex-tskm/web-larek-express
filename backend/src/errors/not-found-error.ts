import { ApiError } from './ApiError';

export class NotFoundError extends ApiError {
  constructor(message: string = 'Ресурс не найден') {
    super(message, 404);
  }
}
