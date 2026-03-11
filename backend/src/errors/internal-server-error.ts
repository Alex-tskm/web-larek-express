import { ApiError } from './ApiError';

export class InternalServerError extends ApiError {
  constructor(message: string = 'Внутренняя ошибка сервера') {
    super(message, 500);
  }
}
