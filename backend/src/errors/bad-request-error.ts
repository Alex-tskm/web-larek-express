import { ApiError } from './ApiError';

export class BadRequestError extends ApiError {
  constructor(message: string = 'Ошибка валидации данных') {
    super(message, 400);
  }
}
