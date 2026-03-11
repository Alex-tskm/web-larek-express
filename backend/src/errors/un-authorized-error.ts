import { ApiError } from './ApiError';

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Неавторизованный доступ') {
    super(message, 401);
  }
}
